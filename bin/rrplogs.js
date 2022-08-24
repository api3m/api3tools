#!/usr/bin/env node

const path = require('path');
const logs = require(path.join(__dirname, '..', 'src', 'logs-command.js'));

logs.initialize('rrp');

const airnodeRequestOptions = {
    airnode: {
        type: "string",
        describe: "Filter to Airnode ID",
        default: null
    },
    request: {
        type: "string",
        describe: "Filter to request ID",
        default: null
    }
};

logs.addEvent({
    name: "full",
    type: "MadeFullRequest",
    options: airnodeRequestOptions,
    abi: "event MadeFullRequest(address indexed airnode, bytes32 indexed requestId, uint256 requesterRequestCount, uint256 chainId, address requester, bytes32 endpointId, address sponsor, address sponsorWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes parameters)",
    filter: (args, f) => f.MadeFullRequest(args.airnode, args.request, null, null, null, null, null, null, null, null, null),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        airnode: x.args.airnode,
        request: x.args.requestId,
        requester: x.args.requester,
        endpoint: x.args.endpointId,
        sponsor: x.args.sponsor
    })
});

logs.addEvent({
    name: "template",
    type: "MadeTemplateRequest",
    options: airnodeRequestOptions,
    abi: "event MadeTemplateRequest(address indexed airnode, bytes32 indexed requestId, uint256 requesterRequestCount, uint256 chainId, address requester, bytes32 templateId, address sponsor, address sponsorWallet, address fulfillAddress, bytes4 fulfillFunctionId, bytes parameters)",
    filter: (args, f) => f.MadeTemplateRequest(args.airnode, args.request, null, null, null, null, null, null, null, null, null),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        airnode: x.args.airnode,
        request: x.args.requestId,
        requester: x.args.requester,
        template: x.args.templateId,
        sponsor: x.args.sponsor
    })
});

logs.addEvent({
    name: "fulfilled",
    type: "FulfilledRequest",
    options: airnodeRequestOptions,
    abi: "event FulfilledRequest(address indexed airnode, bytes32 indexed requestId, bytes data)",
    filter: (args, f) => f.FulfilledRequest(args.airnode, args.request, null),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        airnode: x.args.airnode,
        request: x.args.requestId,
        data: x.args.data
    })
});

logs.addEvent({
    name: "failed",
    type: "FailedRequest",
    options: airnodeRequestOptions,
    abi: "event FailedRequest(address indexed airnode, bytes32 indexed requestId, string errorMessage)",
    filter: (args, f) => f.FailedRequest(args.airnode, args.request, null),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        airnode: x.args.airnode,
        request: x.args.requestId,
        message: x.args.errorMessage
    })
});

logs.addEvent({
    name: "sponsor",
    type: "SetSponsorshipStatus",
    options: {
        sponsor: {
            type: "string",
            describe: "Filter to sponsor address",
            default: null
        },
        requester: {
            type: "string",
            describe: "Filter to requester address",
            default: null
        }
    },
    abi: "event SetSponsorshipStatus(address indexed sponsor, address indexed requester, bool sponsorshipStatus)",
    filter: (args, f) => f.SetSponsorshipStatus(args.sponsor, args.requester, null),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        sponsor: x.args.sponsor,
        requester: x.args.requester
    })
});

logs.runCommand();