#!/usr/bin/env node

const path = require('path');
const logs = require(path.join(__dirname, '..', 'src', 'logs-command.js'));

logs.initialize('dapi');

logs.addEvent({
    type: "SetRrpBeaconUpdatePermissionStatus",
    alias: "permission",
    options: {
        sponsor: { describe: "Filter to sponsor address" },
        requester: { describe: "Filter to requester address" }
    },
    abi: "event SetRrpBeaconUpdatePermissionStatus(address indexed sponsor, address indexed rrpBeaconUpdateRequester, bool status)",
    filter: (args, f) => f.SetRrpBeaconUpdatePermissionStatus(args.sponsor, args.requester, null)
});

logs.addEvent({
    type: "RequestedRrpBeaconUpdate",
    alias: "requested",
    options: {
        beacon: { describe: "Filter to beacon ID" },
        sponsor: { describe: "Filter to sponsor address" },
        requester: { describe: "Filter to requester address" }
    },
    abi: "event RequestedRrpBeaconUpdate(bytes32 indexed beaconId, address indexed sponsor, address indexed requester, bytes32 requestId, address airnode, bytes32 templateId)",
    filter: (args, f) => f.RequestedRrpBeaconUpdate(args.beacon, args.sponsor, args.requester, null, null, null)
});

logs.addEvent({
    type: "RequestedRrpBeaconUpdateRelayed",
    alias: "relayed",
    options: {
        beacon: { describe: "Filter to beacon ID" },
        sponsor: { describe: "Filter to sponsor address" },
        requester: { describe: "Filter to requester address" }
    },
    abi: "event RequestedRrpBeaconUpdateRelayed(bytes32 indexed beaconId, address indexed sponsor, address indexed requester, bytes32 requestId, address airnode, address relayer, bytes32 templateId)",
    filter: (args, f) => f.RequestedRrpBeaconUpdateRelayed(args.beacon, args.sponsor, args.requester, null, null, null, null)
});

logs.addEvent({
    type: "UpdatedBeaconWithRrp",
    alias: "updatedrrp",
    options: {
        beacon: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithRrp(bytes32 indexed beaconId, bytes32 requestId, int256 value, uint256 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithRrp(args.beacon, null, null, null)
});

logs.addEvent({
    type: "RegisteredBeaconUpdateSubscription",
    alias: "subscription",
    options: {
        subscription: { describe: "Filter to subscription ID" }
    },
    abi: "event RegisteredBeaconUpdateSubscription(bytes32 indexed subscriptionId, address airnode, bytes32 templateId, bytes parameters, bytes conditions, address relayer, address sponsor, address requester, bytes4 fulfillFunctionId)",
    filter: (args, f) => f.RegisteredBeaconUpdateSubscription(args.subscription, null, null, null, null, null, null, null, null)
});

logs.addEvent({
    type: "UpdatedBeaconWithPsp",
    alias: "updatedpsp",
    options: {
        beacon: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithPsp(bytes32 indexed beaconId, bytes32 subscriptionId, int224 value, uint32 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithPsp(args.beacon, null, null, null)
});

logs.addEvent({
    type: "UpdatedBeaconWithSignedData",
    alias: "updatedsigned",
    options: {
        beacon: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithSignedData(bytes32 indexed beaconId, int256 value, uint256 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithSignedData(args.beacon, null, null)
});

logs.addEvent({
    type: "UpdatedBeaconSetWithBeacons",
    alias: "updatedsetbeacons",
    options: {
        beaconset: { describe: "Filter to beacon set ID" }
    },
    abi: "event UpdatedBeaconSetWithBeacons(bytes32 indexed beaconSetId, int224 value, uint32 timestamp)",
    filter: (args, f) => f.UpdatedBeaconSetWithBeacons(args.beaconset, null, null)
});

logs.addEvent({
    type: "UpdatedBeaconSetWithSignedData",
    alias: "updatedsetsigned",
    options: {
        dapi: { describe: "Filter to dAPI ID" }
    },
    abi: "event UpdatedBeaconSetWithSignedData(bytes32 indexed dapiId, int224 value, uint32 timestamp)",
    filter: (args, f) => f.UpdatedBeaconSetWithSignedData(args.dapi, null, null)
});

logs.addEvent({
    type: "AddedUnlimitedReader",
    alias: "unlimited",
    options: {
        reader: { describe: "Filter to reader address" }
    },
    abi: "event AddedUnlimitedReader(address indexed unlimitedReader)",
    filter: (args, f) => f.AddedUnlimitedReader(args.reader)
});

logs.addEvent({
    type: "SetDapiName",
    alias: "namedapi",
    options: {
        name: { describe: "Filter to dAPI name" },
        sender: { describe: "Filter to sender address" }
    },
    abi: "event SetDapiName(bytes32 indexed dapiName, bytes32 dataFeedId, address indexed sender)",
    filter: (args, f) => f.SetDapiName(args.name, null, args.sender)
});

logs.runCommand();