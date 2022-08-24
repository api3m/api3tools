const fs = require('fs');
const assert = require('assert');
const yargs = require('yargs');
const ethers = require('ethers');
const csv = require('objects-to-csv');
const path = require('path');
const EthDater = require('ethereum-block-by-date');
const moment = require('moment');

module.exports = {
    initialize,
    addEvent,
    runCommand
};

const definitions = {}; // event definitions
let contractType = null; // rrp or dapi
let args = null; // yargs argv

function initialize(cType) {
    contractType = cType;

    args = yargs.usage(`\nUsage: ${contractType}logs <event name | networks>`)
        .option("n", { alias: "network", describe: "Network: ethereum, polygon, rsk, etc...", type: "string", default: "ethereum" })
        .option("f", { alias: "from", describe: "From block number or ISO8601 date", type: "string", default: "0" })
        .option("t", { alias: "to", describe: "To block number or ISO8601 date", type: "string", default: "latest" })
        .option("b", { alias: "by", describe: "Number of blocks per query", type: "number" })
        .option("w", { alias: "wait", describe: "Seconds to wait between queries", type: "number" })
        .option("o", { alias: "output", describe: "Output file ending with .json or .csv", type: "string" });
}

function addEvent(event) {
    args = args.command(event.name, `Search for ${event.type} events`, event.options);
    definitions[event.name] = {
        type: event.type,
        abi: event.abi,
        createFilter: event.filter,
        map: event.map
    };
}

async function runCommand(command) {
    try {
        finalizeArgs();
    } catch (error) {
        console.error(error.message);
        return;
    }

    if (args.command == "networks") {
        listNetworks();
        return;
    }

    let network = null;
    try {
        network = getNetwork(args.network, true);
    } catch (error) {
        console.error(error.message);
        return;
    }

    const definition = definitions[args.command];
    const provider = new ethers.providers.JsonRpcProvider(network.rpc);
    const contract = new ethers.Contract(network.contracts[contractType], [definition.abi], provider);
    const filter = definition.createFilter(args, contract.filters);

    try {
        await prepareForBlockRangeLoop(provider);
    } catch (error) {
        handleEthersError(error);
        return;
    }

    console.log(`Searching ${network.name} blocks ${args.from} to ${args.to} for ${definition.type} events...`);

    let appendFile = false;
    let totalFound = 0;
    for (let queryFrom = args.from; queryFrom <= args.to; queryFrom += args.by) {
        let queryTo = Math.min(queryFrom + args.by - 1, args.to);

        if (args.wait && queryFrom != args.from) {
            await delay(args.wait);
        }

        process.stdout.write(`    Querying blocks ${queryFrom} to ${queryTo}: `);
        try {
            const events = await contract.queryFilter(filter, queryFrom, queryTo);
            console.log(`found ${events.length} events`);
            totalFound += events.length;
            if (events.length > 0) {
                await writeOutput(events.map(x => mapEvent(x, definition.map)), appendFile);
                appendFile = true;
            }
        } catch (error) {
            handleEthersError(error);
            return;
        }
    }
    closeOutput(totalFound);

    const fileMessage = (totalFound > 0 && args.output) ? `, stored in ${args.output}` : "";
    console.log(`Found ${totalFound} ${definition.type} events` + fileMessage);
}

function finalizeArgs() {
    assert(contractType, "Must provide contract type");
    assert(Object.keys(definitions).length > 0, "Must provide event definitions");

    args = args.command("networks", "List all available networks")
        .demandCommand(1, "Must provide command: <event name | networks>")
        .strict()
        .help(true).argv;
    assert(args, "Yargs argv is falsy");

    if (args.output && !(args.output.endsWith(".json") || args.output.endsWith(".csv"))) {
        throw new Error("Output file name must end with .json or .csv");
    }

    args.networksPath = path.join(__dirname, "..", "networks");
    args.command = args._[0];
}

function getNetwork(networkId, checkForContract) {
    const network = JSON.parse(fs.readFileSync(path.join(args.networksPath, `${networkId}.json`), 'utf8'));
    assert(network, `Problem reading network file`);
    assert(network.name, `Network ${networkId} is missing name`);
    assert(network.rpc, `Network ${networkId} is missing RPC info`);
    assert(network.contracts, `Network ${networkId} is missing contracts object`);
    if (checkForContract) {
        assert(network.contracts.hasOwnProperty(contractType), `Network ${networkId} is missing ${contractType} contract`);
    }
    return network;
}

async function prepareForBlockRangeLoop(provider) {
    const blockNumber = await provider.getBlockNumber();
    assert(blockNumber && blockNumber > 0, "Got a non-positive block number, something is wrong");

    if (args.to === "latest") {
        // Ethers accepts "latest" but we need the actual block number for the loop condition.
        args.to = blockNumber;
    } else {
        args.to = await getBlockByNumberOrDate("to", args.to, provider);
    }

    if (args.to < 0) {
        // It's a negative offset from the current block number.
        assert(-args.to <= blockNumber, `Cannot search to offset ${args.to} when current block is ${blockNumber}`);
        args.to = blockNumber + args.to;
    }

    args.from = await getBlockByNumberOrDate("from", args.from, provider);

    if (args.from < 0) {
        // It's a negative offset from the end of the range.
        assert(-args.from <= args.to, `Cannot search from offset ${args.from} when end of range is ${args.to}`);
        args.from = args.to + args.from;
    }

    assert(args.from >= 0 && args.to >= args.from, `Cannot search from ${args.from} to ${args.to}`)

    // If no --by option, search the whole range in one query.
    if (args.by === undefined) {
        args.by = args.to + 1;
    }

    assert(args.by > 0, `Can't search by queries of non-positive size ${args.by}`);

    if (args.wait !== undefined) {
        assert(args.wait > 0, `Can't wait for non-positive seconds ${args.wait} between queries`);
    }
}

async function getBlockByNumberOrDate(which, given, provider) {
    const givenAsNumber = Number(given);
    if (Number.isInteger(givenAsNumber)) {
        // If it's an integer assume it's a block number or a negative offset
        return givenAsNumber;
    } else if (moment(given, moment.ISO_8601).isValid()) {
        // Otherwise treat it as a date string
        const dater = new EthDater(provider);
        const found = await dater.getDate(given, which == "from");
        if (found && found.block) {
            assert(found.block >= 0, `Found negative block number ${found.block} for date/time ${given}`);
            console.log(`Using --${which} block ${found.block} for date/time ${given}`);
            return found.block;
        } else {
            throw new Error("Could not find block for date/time: " + given);
        }
    } else {
        throw new Error("Invalid block number or date/time: " + given);
    }
}

function mapEvent(event, argsMap) {
    const mapped = argsMap(event.args);
    mapped.blockNumber = event.blockNumber;
    mapped.transaction = event.transactionHash;
    return mapped;
}

async function writeOutput(events, append) {
    if (args.output) {
        if (args.output.endsWith(".json")) {
            writeJsonOutput(events, append);
        } else if (args.output.endsWith(".csv")) {
            await new csv(events).toDisk(args.output, { append })
        }
    } else {
        console.log(events);
    }
}

function writeJsonOutput(events, append) {
    const s = JSON.stringify(events).slice(1, -1); // remove the array brackets
    if (append) {
        fs.appendFileSync(args.output, "," + s);
    } else {
        fs.writeFileSync(args.output, "[" + s);
    }
}

function closeOutput(totalFound) {
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

function listNetworks() {
    const networks = fs.readdirSync(args.networksPath);
    networks.forEach(filename => {
        const parts = filename.split(".");
        if (parts.length == 2 && parts[1] == "json") {
            try {
                const network = getNetwork(parts[0], false);
                if (network.contracts.hasOwnProperty(contractType)) {
                    console.log(parts[0] + ": " + network.name);
                }
            } catch (error) {
                console.error('!!! ' + error.message);
            }
        }
    });
}

function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
