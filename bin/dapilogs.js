#!/usr/bin/env node

const path = require('path');
const logs = require(path.join(__dirname, '..', 'src', 'logs-command.js'));

logs.initialize('dapi');

logs.addEvent({
    name: "name",
    type: "SetDapiName",
    options: {
        name: {
            type: "string",
            describe: "Filter to dAPI name",
            default: null
        },
        sender: {
            type: "string",
            describe: "Filter to sender address",
            default: null
        }
    },
    abi: "event SetDapiName(bytes32 indexed dapiName, bytes32 dataFeedId, address indexed sender)",
    filter: (args, f) => f.SetDapiName(args.name, null, args.sender),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        name: x.args.dapiName,
        sender: x.args.sender,
        feed: x.args.dataFeedId
    })
});

logs.addEvent({
    name: "ubsd",
    type: "UpdatedBeaconWithSignedData",
    options: {
        id: {
            type: "string",
            describe: "Filter to beacon ID",
            default: null
        }
    },
    abi: "event UpdatedBeaconWithSignedData(bytes32 indexed beaconId, int256 value, uint256 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithSignedData(args.id, null, null),
    map: x => ({
        block: x.blockNumber,
        transaction: x.transactionHash,
        id: x.args.beaconId,
        value: x.args.value,
        timestamp: x.args.timestamp
    })
});

logs.runCommand();