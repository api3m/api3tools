#!/usr/bin/env node

const fs = require('fs');
const yargs = require("yargs");
const ethers = require("ethers");
const csv = require('objects-to-csv')

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
    .option("f", { alias: "from-block", describe: "From block number", type: "number", default: 0 })
    .option("t", { alias: "to-block", describe: "To block number", type: "number", default: "latest" })
    .option("o", { alias: "output", describe: "Output format", type: "string", default: "console" })
    .choices("o", ["console", "json", "csv"])
    .command("full", "Query MadeFullRequest events", airnodeRequestOptions)
    .command("template", "Query MadeTemplateRequest events", airnodeRequestOptions)
    .command("fulfilled", "Query FulfilledRequest events", airnodeRequestOptions)
    .command("failed", "Query FailedRequest events", airnodeRequestOptions)
    .command("sponsor", "Query SetSponsorshipStatus events", sponsorRequesterOptions)
    .demandCommand(1, "Need to specify an event type: full | template | fulfilled | failed | sponsor")
    .help(true).argv;

const abi = [
    "event SetSponsorshipStatus(address indexed sponsor, address indexed requester, bool sponsorshipStatus)",
    "event MadeTemplateRequest(address indexed airnode, bytes32 indexed requestId, uint256 requesterRequestCount, uint256 chainId, address requester, bytes32 templateId, address sponsor, address sponsorWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes parameters)",
    "event MadeFullRequest(address indexed airnode, bytes32 indexed requestId, uint256 requesterRequestCount, uint256 chainId, address requester, bytes32 endpointId, address sponsor, address sponsorWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes parameters)",
    "event FulfilledRequest(address indexed airnode, bytes32 indexed requestId, bytes data)",
    "event FailedRequest(address indexed airnode, bytes32 indexed requestId, string errorMessage)"
];

const network = JSON.parse(fs.readFileSync(`./networks/${args.network}.json`, 'utf8'));
const provider = new ethers.providers.JsonRpcProvider(network.rpc);
const rrp = new ethers.Contract(network.contract, abi, provider);

const filters = {
    full: rrp.filters.MadeFullRequest(args.airnode, args.request, null, null, null, null, null, null, null, null, null),
    template: rrp.filters.MadeTemplateRequest(args.airnode, args.request, null, null, null, null, null, null, null, null, null),
    fulfilled: rrp.filters.FulfilledRequest(args.airnode, args.request, null),
    failed: rrp.filters.FailedRequest(args.airnode, args.request, null),
    sponsor: rrp.filters.SetSponsorshipStatus(args.sponsor, args.requester, null)
};

const maps = {
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
}

formats = {
    console: function (results) {
        console.log(results)
    },
    json: function (results) {
        console.log(JSON.stringify(results))
    },
    csv: async function (results) {
        console.log(await new csv(results).toString());
    }
};

const query = rrp.queryFilter(filters[args._[0]], args.fromBlock, args.toBlock);
query.then(events => formats[args.output](events.map(maps[args._[0]])));
