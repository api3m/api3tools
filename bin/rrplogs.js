#!/usr/bin/env node

const fs = require('fs');
const yargs = require("yargs");
const ethers = require("ethers");
const csv = require('objects-to-csv');
const path = require('path');
const EthDater = require('ethereum-block-by-date');
const moment = require('moment');

(async function () {

    const args = getArgs();
    const abi = getAbi();
    if (!args || !abi) {
        return;
    }

    const projectPath = path.dirname(__dirname);
    const networksPath = path.join(projectPath, "networks");

    if (args.command == "networks") {
        listNetworks(networksPath);
        return;
    }

    let network = null;
    try {
        network = JSON.parse(fs.readFileSync(`${networksPath}/${args.network}.json`, 'utf8'));
    } catch (error) {
        console.error(error.message);
        return;
    }

    const provider = new ethers.providers.JsonRpcProvider(network.rpc);
    const contract = new ethers.Contract(network.contract, abi, provider);
    const filter = getFilters(args, contract)[args.command];
    const mapping = getMaps()[args.command];

    try {
        await prepareForBlockRangeLoop(args, provider);
    } catch (error) {
        handleEthersError(error);
        return;
    }

    console.log(`Searching ${network.name} blocks ${args.from} to ${args.to} for ${args.eventType} events...`);

    let appendFile = false;
    let totalFound = 0;
    for (let f = args.from; f <= args.to; f += args.by) {
        let t = Math.min(f + args.by - 1, args.to);

        if (args.wait && f != args.from) {
            await delay(args.wait);
        }

        process.stdout.write(`    Querying blocks ${f} to ${t}: `);
        try {
            const events = await contract.queryFilter(filter, f, t);
            console.log(`found ${events.length} events`);
            totalFound += events.length;
            if (events.length > 0) {
                await writeOutput(args, events.map(mapping), appendFile);
                appendFile = true;
            }
        } catch (error) {
            handleEthersError(error);
            return;
        }
    }
    closeOutput(args, totalFound);

    const fileMessage = args.output ? `, stored in ${args.output}` : "";
    console.log(`Found ${totalFound} ${args.eventType} events` + fileMessage);

}());

function getArgs() {
    const airnodeRequestOptions = {
        airnode: {
            alias: "a",
            type: "string",
            describe: "Filter to Airnode ID",
            default: null
        },
        request: {
            alias: "r",
            type: "string",
            describe: "Filter to request ID",
            default: null
        }
    };

    const sponsorRequesterOptions = {
        sponsor: {
            alias: "s",
            type: "string",
            describe: "Filter to sponsor address",
            default: null
        },
        requester: {
            alias: "r",
            type: "string",
            describe: "Filter to requester address",
            default: null
        }
    };

    const args = yargs.usage("\nUsage: rrplogs <event type: full | template | fulfilled | failed | sponsor>")
        .option("n", { alias: "network", describe: "Network: ethereum, polygon, rsk, etc...", type: "string", default: "ethereum" })
        .option("f", { alias: "from", describe: "From block number or ISO8601 date", type: "string", default: "0" })
        .option("t", { alias: "to", describe: "To block number or ISO8601 date", type: "string", default: "latest" })
        .option("b", { alias: "by", describe: "Number of blocks per query", type: "number" })
        .option("w", { alias: "wait", describe: "Seconds to wait between queries", type: "number" })
        .option("o", { alias: "output", describe: "Output file ending with .json or .csv", type: "string" })
        .command("full", "Search for MadeFullRequest events", airnodeRequestOptions)
        .command("template", "Search for MadeTemplateRequest events", airnodeRequestOptions)
        .command("fulfilled", "Search for FulfilledRequest events", airnodeRequestOptions)
        .command("failed", "Search for FailedRequest events", airnodeRequestOptions)
        .command("sponsor", "Search for SetSponsorshipStatus events", sponsorRequesterOptions)
        .command("networks", "List all available networks")
        .demandCommand(1, "Need to specify command or event type: full | template | fulfilled | failed | sponsor | networks")
        .strict()
        .help(true).argv;

    if (args.output && !(args.output.endsWith(".json") || args.output.endsWith(".csv"))) {
        console.log("Output file name must end with .json or .csv");
        return null;
    }

    args.command = args._[0];
    args.eventType = {
        full: "MadeFullRequest",
        template: "MadeTemplateRequest",
        fulfilled: "FulfilledRequest",
        failed: "FailedRequest",
        sponsor: "SetSponsorshipStatus"
    }[args.command];

    return args;
}

function getAbi() {
    return [
        "event SetSponsorshipStatus(address indexed sponsor, address indexed requester, bool sponsorshipStatus)",
        "event MadeTemplateRequest(address indexed airnode, bytes32 indexed requestId, uint256 requesterRequestCount, uint256 chainId, address requester, bytes32 templateId, address sponsor, address sponsorWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes parameters)",
        "event MadeFullRequest(address indexed airnode, bytes32 indexed requestId, uint256 requesterRequestCount, uint256 chainId, address requester, bytes32 endpointId, address sponsor, address sponsorWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes parameters)",
        "event FulfilledRequest(address indexed airnode, bytes32 indexed requestId, bytes data)",
        "event FailedRequest(address indexed airnode, bytes32 indexed requestId, string errorMessage)"
    ];
}

function getFilters(args, contract) {
    return {
        full: contract.filters.MadeFullRequest(args.airnode, args.request, null, null, null, null, null, null, null, null, null),
        template: contract.filters.MadeTemplateRequest(args.airnode, args.request, null, null, null, null, null, null, null, null, null),
        fulfilled: contract.filters.FulfilledRequest(args.airnode, args.request, null),
        failed: contract.filters.FailedRequest(args.airnode, args.request, null),
        sponsor: contract.filters.SetSponsorshipStatus(args.sponsor, args.requester, null)
    };
}

function getMaps() {
    return {
        full: x => ({
            block: x.blockNumber,
            transaction: x.transactionHash,
            airnode: x.args.airnode,
            request: x.args.requestId,
            requester: x.args.requester,
            endpoint: x.args.endpointId,
            sponsor: x.args.sponsor
        }),
        template: x => ({
            block: x.blockNumber,
            transaction: x.transactionHash,
            airnode: x.args.airnode,
            request: x.args.requestId,
            requester: x.args.requester,
            template: x.args.templateId,
            sponsor: x.args.sponsor
        }),
        fulfilled: x => ({
            block: x.blockNumber,
            transaction: x.transactionHash,
            airnode: x.args.airnode,
            request: x.args.requestId,
            data: x.args.data
        }),
        failed: x => ({
            block: x.blockNumber,
            transaction: x.transactionHash,
            airnode: x.args.airnode,
            request: x.args.requestId,
            message: x.args.errorMessage
        }),
        sponsor: x => ({
            block: x.blockNumber,
            transaction: x.transactionHash,
            sponsor: x.args.sponsor,
            requester: x.args.requester
        })
    };
}

async function prepareForBlockRangeLoop(args, provider) {
    args.from = await getBlockByNumberOrDate("from", args.from, provider);

    if (args.to === "latest") {
        // Ethers accepts "latest" but we need the actual block number for the loop condition.
        args.to = await provider.getBlockNumber();
    } else {
        args.to = await getBlockByNumberOrDate("to", args.to, provider);
    }

    // If no --by option, search the whole range in one query.
    if (!args.by) {
        args.by = args.to + 1;
    }
}

async function getBlockByNumberOrDate(which, given, provider) {
    const givenAsNumber = Number(given);
    if (Number.isInteger(givenAsNumber) && givenAsNumber >= 0) {
        // If it's a positive integer assume it's a block number
        return givenAsNumber;
    } else if (moment(given, moment.ISO_8601).isValid()) {
        // Otherwise treat it as a date string
        const dater = new EthDater(provider);
        const found = await dater.getDate(given, which == "from");
        if (found && found.block) {
            console.log(`Using --${which} block ${found.block} for date/time ${given}`);
            return found.block;
        } else {
            throw new Error("Could not find block for date/time: " + given);
        }
    } else {
        throw new Error("Invalid block number or date/time: " + given);
    }
}

async function writeOutput(args, events, append) {
    if (args.output) {
        if (args.output.endsWith(".json")) {
            writeJsonOutput(args, events, append);
        } else if (args.output.endsWith(".csv")) {
            await new csv(events).toDisk(args.output, { append })
        }
    } else {
        console.log(events);
    }
}

function writeJsonOutput(args, events, append) {
    const s = JSON.stringify(events).slice(1, -1); // remove the array brackets
    if (append) {
        fs.appendFileSync(args.output, "," + s);
    } else {
        fs.writeFileSync(args.output, "[" + s);
    }
}

function closeOutput(args, totalFound) {
    if (args.output && args.output.endsWith(".json") && totalFound > 0) {
        fs.appendFileSync(args.output, "]");
    }
}

function handleEthersError(error) {
    if (typeof error.body === 'string') {
        console.error(JSON.parse(error.body).error.message);
    } else {
        console.error(error.message);
    }
}

function listNetworks(networksPath) {
    const networks = fs.readdirSync(networksPath);
    networks.forEach(filename => {
        const parts = filename.split(".");
        if (parts.length == 2 && parts[1] == "json") {
            const network = JSON.parse(fs.readFileSync(`${networksPath}/${filename}`, 'utf8'));
            console.log(parts[0] + ": " + network.name);
        }
    });
}

function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
