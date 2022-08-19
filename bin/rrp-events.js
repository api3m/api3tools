#!/usr/bin/env node

const fs = require('fs');
const yargs = require("yargs");
const ethers = require("ethers");
const csv = require('objects-to-csv');
const path = require('path');

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
    const maps = getMaps();

    await prepareForBlockRangeLoop(args, provider);

    console.log(`Searching blocks ${args.from} to ${args.to} for ${args.eventType} events...`);
    let appendFile = false;
    for (let f = args.from; f <= args.to; f += args.by) {
        let t = Math.min(f + args.by - 1, args.to);
        process.stdout.write(`Querying blocks ${f} to ${t}: `);
        try {
            const events = await contract.queryFilter(filter, f, t);
            console.log(`found ${events.length} events`);
            if (events.length > 0) {
                await writeOutput(args, events.map(maps[args.command]), appendFile);
                appendFile = true;
            }
        } catch (error) {
            handleQueryException(error);
        }
    }

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

    const args = yargs.usage("\nUsage: rrp-events <event type: full | template | fulfilled | failed | sponsor>")
        .option("n", { alias: "network", describe: "Network: ethereum, polygon, rsk, etc...", type: "string", default: "ethereum" })
        .option("f", { alias: "from", describe: "From block number", type: "number", default: 0 })
        .option("t", { alias: "to", describe: "To block number", type: "number", default: "latest" })
        .option("b", { alias: "by", describe: "Number of blocks per request", type: "number" })
        .option("o", { alias: "output", describe: "Output file .json or .csv", type: "string" })
        .command("full", "Search for MadeFullRequest events", airnodeRequestOptions)
        .command("template", "Search for MadeTemplateRequest events", airnodeRequestOptions)
        .command("fulfilled", "Search for FulfilledRequest events", airnodeRequestOptions)
        .command("failed", "Search for FailedRequest events", airnodeRequestOptions)
        .command("sponsor", "Search for SetSponsorshipStatus events", sponsorRequesterOptions)
        .command("networks", "List all available networks")
        .demandCommand(1, "Need to specify command or event type: full | template | fulfilled | failed | sponsor | networks")
        .strict()
        .help(true).argv;

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
    }
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
    // Ethers accepts "latest" but we need the actual block number for the loop condition.
    if (args.to === "latest") {
        args.to = await provider.getBlockNumber();
    }

    // If no by arguent, do the whole range in one query,
    if (!args.by) {
        args.by = args.to + 1;
    }
}

async function writeOutput(args, events, append) {
    if (args.output) {
        if (args.output.endsWith(".json")) {
            if (append) {
                fs.appendFileSync(args.output, JSON.stringify(events));
            } else {
                fs.writeFileSync(args.output, JSON.stringify(events));
            }
        } else if (args.output.endsWith(".csv")) {
            await new csv(events).toDisk(args.output, { append })
        } else {
            throw new Error("Output file must end with .json or .csv");
        }
    } else {
        console.log(events);
    }
}

function handleQueryException(error) {
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