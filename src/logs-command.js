const fs = require('fs');
const assert = require('assert');
const yargs = require('yargs');
const ethers = require('ethers');
const csv = require('objects-to-csv');
const path = require('path');
const EthDater = require('ethereum-block-by-date');
const moment = require('moment');
const csvtojson = require('csvtojson');

module.exports = {
    initialize,
    addEvent,
    runCommand
};

const eventAliases = {};
const eventDefinitons = {};
let contractType = null; // rrp or dapi
let args = null; // yargs argv

function initialize(cType) {
    contractType = cType;

    args = yargs.usage(`\nUsage: ${contractType}logs <event type | command>`)
        .option("n", { alias: "network", describe: "Network: ethereum, polygon, ...", type: "string", default: "ethereum" })
        .option("f", { alias: "from", describe: "From block number or ISO8601 date", type: "string", default: "0" })
        .option("t", { alias: "to", describe: "To block number or ISO8601 date", type: "string", default: "latest" })
        .option("b", { alias: "by", describe: "Number of blocks per query", type: "number" })
        .option("w", { alias: "wait", describe: "Seconds to wait between queries", type: "number" })
        .option("o", { alias: "output", describe: "Output file ending with .json or .csv", type: "string" });
}

function addEvent(event) {
    eventAliases[event.type] = event.type;
    eventAliases[event.alias] = event.type;

    // Set option defaults
    for (const name in event.options) {
        const value = event.options[name];
        if (value.type === undefined) {
            value.type = "string"; // most options are strings
        }
        if (value.default === undefined) {
            value.default = null; // default to null so ethers will ignore
        }
    }

    args = args.command([event.type, event.alias], "Search", event.options);
    eventDefinitons[event.type] = {
        abi: event.abi,
        createFilter: event.filter,
        map: event.map
    };
}

async function runCommand() {
    let network = null;
    let provider = null;
    try {
        finalizeArgs();

        if (args.command == "networks") {
            listNetworks();
            return;
        }

        network = getNetwork(args.network, true);
        provider = new ethers.providers.JsonRpcProvider(network.rpc);

        if (args.command == "dates") {
            await addDates(provider);
            return;
        }
    } catch (error) {
        console.error(error.message);
        return;
    }

    const definition = eventDefinitons[args.eventType];
    const contract = new ethers.Contract(network.contracts[contractType], [definition.abi], provider);
    const filter = definition.createFilter(args, contract.filters);

    try {
        await prepareForBlockRangeLoop(provider);
    } catch (error) {
        handleEthersError(error);
        return;
    }

    console.log(`Searching ${network.name} blocks ${args.from} to ${args.to} for ${args.eventType} events...`);

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
    console.log(`Found ${totalFound} ${args.eventType} events` + fileMessage);
}

function finalizeArgs() {
    assert(contractType, "Must provide contract type");
    assert(Object.keys(eventDefinitons).length > 0, "Must provide event definitions");

    args = args.command("networks", "List all available networks")
        .command("dates", "Add date column to CSV file", { input: { alias: "i", describe: "Input file", type: "string", demandOption: true } })
        .demandCommand(1, "Must provide a command: <event type | command>")
        .strict()
        .help(true).argv;
    assert(args, "Yargs argv is falsy");

    if (args.output && !(args.output.endsWith(".json") || args.output.endsWith(".csv"))) {
        throw new Error("Output file name must end with .json or .csv");
    }

    args.networksPath = path.join(__dirname, "..", "networks");
    args.command = args._[0];
    if (args.command in eventAliases) {
        args.eventType = eventAliases[args.command];
    }
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

function mapEvent(event, eventArgsMap) {
    const mapped = eventArgsMap(event.args);
    mapped.network = args.network;
    mapped.blockNumber = event.blockNumber;
    mapped.transaction = event.transactionHash;
    return mapped;
}

async function writeOutput(events, append) {
    if (args.output) {
        if (args.output.endsWith(".json")) {
            writeJsonOutput(events, append);
        } else if (args.output.endsWith(".csv")) {
            await new csv(events).toDisk(args.output, { append });
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
        try {
            console.error(JSON.parse(error.body).error.message);
        } catch (e) {
            console.error(e.message + ": " + error.body);
        }
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

async function addDates(provider) {
    assert(args.input.endsWith(".csv"), `Input file ${args.input} must be CSV`);

    console.log(`Adding dates from ${args.network} network to events in ${args.input}`);

    csvtojson().fromFile(args.input).then(async (events) => {
        const dateGroups = await findDateGroups(provider, events);
        events.forEach(event => {
            for (let i = 0; i < dateGroups.length; i++) {
                if (event.blockNumber >= dateGroups[i].firstBlock && event.blockNumber < dateGroups[i + 1].firstBlock) {
                    event.date = dateGroups[i].label;
                }
            }
        });

        await writeOutput(events, false);
        if (args.output) {
            console.log(`Stored output in ${args.output}`);
        }
    })
}

async function findDateGroups(provider, events) {
    // Find the start times of the first and last groups
    const fileFirstBlock = await provider.getBlock(parseInt(events[0].blockNumber));
    const firstGroupStartTime = moment.utc(moment.unix(fileFirstBlock.timestamp).utc().format("YYYY-MM-DD"));
    const fileLastBlock = await provider.getBlock(parseInt(events[events.length - 1].blockNumber));
    const lastGroupStartTime = moment.utc(moment.unix(fileLastBlock.timestamp).utc().format("YYYY-MM-DD")).add(1, 'days'); // add 1 to help search loop

    // Cache to speed up this painfully slow process
    const firstBlocksCacheFile = path.join(__dirname, "..", "cache", `first-blocks-by-date-${args.network}.json`);
    const firstBlocksCache = fs.existsSync(firstBlocksCacheFile) ? JSON.parse(fs.readFileSync(firstBlocksCacheFile, 'utf8')) : {};

    // Build a list of date groups to search through
    const groups = [];
    const dater = new EthDater(provider);
    for (let groupStartTime = firstGroupStartTime; groupStartTime.unix() <= lastGroupStartTime.unix(); groupStartTime = groupStartTime.add(1, 'days')) {
        const groupLabel = groupStartTime.format("YYYY-MM-DD");

        let firstBlockNumber = firstBlocksCache[groupLabel];
        if (firstBlockNumber === undefined) {
            process.stdout.write(`    Finding first block for ${groupLabel} remotely: `);
            const found = await dater.getDate(groupStartTime.toISOString(), true);
            if (found && found.block) {
                assert(found.block >= 0, `Found negative block number ${found.block} for date/time ${groupStartTime.toISOString()}`);
                console.log(`found block ${found.block}`);
                firstBlockNumber = found.block;
                firstBlocksCache[groupLabel] = firstBlockNumber;
                fs.writeFileSync(firstBlocksCacheFile, JSON.stringify(firstBlocksCache));
            } else {
                throw new Error("Could not find block for date/time: " + groupStartTime.toISOString());
            }
        }

        groups.push({
            firstBlock: firstBlockNumber,
            label: groupLabel
        });
    }

    return groups;
}

function delay(seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
}
