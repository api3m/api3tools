#!/usr/bin/env node

const path = require('path');
const logs = require(path.join(__dirname, '..', 'src', 'logs-command.js'));

logs.initialize('dapi');

logs.addEvent({
    type: "SetRrpBeaconUpdatePermissionStatus",
    alias: "srbups",
    options: {
        sponsor: { describe: "Filter to sponsor address" },
        requester: { describe: "Filter to requester address" }
    },
    abi: "event SetRrpBeaconUpdatePermissionStatus(address indexed sponsor, address indexed rrpBeaconUpdateRequester, bool status)",
    filter: (args, f) => f.SetRrpBeaconUpdatePermissionStatus(args.sponsor, args.requester, null),
    map: x => ({
        sponsor: x.sponsor,
        rrpBeaconUpdateRequester: x.rrpBeaconUpdateRequester,
        status: x.status
    })
});

logs.addEvent({
    type: "RequestedRrpBeaconUpdate",
    alias: "rrbu",
    options: {
        beacon: { describe: "Filter to beacon ID" },
        sponsor: { describe: "Filter to sponsor address" },
        requester: { describe: "Filter to requester address" }
    },
    abi: "event RequestedRrpBeaconUpdate(bytes32 indexed beaconId, address indexed sponsor, address indexed requester, bytes32 requestId, address airnode, bytes32 templateId)",
    filter: (args, f) => f.RequestedRrpBeaconUpdate(args.beacon, args.sponsor, args.requester, null, null, null),
    map: x => ({
        beaconId: x.beaconId,
        sponsor: x.sponsor,
        requester: x.requester,
        requestId: x.requestId,
        airnode: x.airnode,
        templateId: x.templateId
    })
});

logs.addEvent({
    type: "RequestedRrpBeaconUpdateRelayed",
    alias: "rrbur",
    options: {
        beacon: { describe: "Filter to beacon ID" },
        sponsor: { describe: "Filter to sponsor address" },
        requester: { describe: "Filter to requester address" }
    },
    abi: "event RequestedRrpBeaconUpdateRelayed(bytes32 indexed beaconId, address indexed sponsor, address indexed requester, bytes32 requestId, address airnode, address relayer, bytes32 templateId)",
    filter: (args, f) => f.RequestedRrpBeaconUpdateRelayed(args.beacon, args.sponsor, args.requester, null, null, null, null),
    map: x => ({
        beaconId: x.beaconId,
        sponsor: x.sponsor,
        requester: x.requester,
        requestId: x.requestId,
        airnode: x.airnode,
        relayer: x.relayer,
        templateId: x.templateId
    })
});

logs.addEvent({
    type: "UpdatedBeaconWithRrp",
    alias: "ubwr",
    options: {
        beacon: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithRrp(bytes32 indexed beaconId, bytes32 requestId, int256 value, uint256 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithRrp(args.beacon, null, null, null),
    map: x => ({
        beaconId: x.beaconId,
        requestId: x.requestId,
        value: x.value.toHexString(),
        timestamp: x.timestamp.toNumber()
    })
});

logs.addEvent({
    type: "RegisteredBeaconUpdateSubscription",
    alias: "rbus",
    options: {
        subscription: { describe: "Filter to subscription ID" }
    },
    abi: "event RegisteredBeaconUpdateSubscription(bytes32 indexed subscriptionId, address airnode, bytes32 templateId, bytes parameters, bytes conditions, address relayer, address sponsor, address requester, bytes4 fulfillFunctionId)",
    filter: (args, f) => f.RegisteredBeaconUpdateSubscription(args.subscription, null, null, null, null, null, null, null, null),
    map: x => ({
        subscriptionId: x.subscriptionId,
        airnode: x.airnode,
        templateId: x.templateId,
        parameters: x.parameters,
        conditions: x.conditions,
        relayer: x.relayer,
        sponsor: x.sponsor,
        requester: x.requester,
        fulfillFunctionId: x.fulfillFunctionId
    })
});

logs.addEvent({
    type: "UpdatedBeaconWithPsp",
    alias: "ubwp",
    options: {
        beacon: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithPsp(bytes32 indexed beaconId, bytes32 subscriptionId, int224 value, uint32 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithPsp(args.beacon, null, null, null),
    map: x => ({
        beaconId: x.beaconId,
        subscriptionId: x.subscriptionId,
        value: x.value.toHexString(),
        timestamp: x.timestamp.toNumber()
    })
});

logs.addEvent({
    type: "UpdatedBeaconWithSignedData",
    alias: "ubwsd",
    options: {
        beacon: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithSignedData(bytes32 indexed beaconId, int256 value, uint256 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithSignedData(args.beacon, null, null),
    map: x => ({
        beaconId: x.beaconId,
        value: x.value.toHexString(),
        timestamp: x.timestamp.toNumber()
    })
});

logs.addEvent({
    type: "UpdatedBeaconSetWithBeacons",
    alias: "ubswb",
    options: {
        beaconset: { describe: "Filter to beacon set ID" }
    },
    abi: "event UpdatedBeaconSetWithBeacons(bytes32 indexed beaconSetId, int224 value, uint32 timestamp)",
    filter: (args, f) => f.UpdatedBeaconSetWithBeacons(args.beaconset, null, null),
    map: x => ({
        beaconSetId: x.beaconSetId,
        value: x.value.toHexString(),
        timestamp: x.timestamp.toNumber()
    })
});

logs.addEvent({
    type: "UpdatedBeaconSetWithSignedData",
    alias: "ubswsd",
    options: {
        dapi: { describe: "Filter to dAPI ID" }
    },
    abi: "event UpdatedBeaconSetWithSignedData(bytes32 indexed dapiId, int224 value, uint32 timestamp)",
    filter: (args, f) => f.UpdatedBeaconSetWithSignedData(args.dapi, null, null),
    map: x => ({
        dapiId: x.dapiId,
        value: x.value.toHexString(),
        timestamp: x.timestamp.toNumber()
    })
});

logs.addEvent({
    type: "AddedUnlimitedReader",
    alias: "aur",
    options: {
        reader: { describe: "Filter to reader address" }
    },
    abi: "event AddedUnlimitedReader(address indexed unlimitedReader)",
    filter: (args, f) => f.AddedUnlimitedReader(args.reader),
    map: x => ({
        unlimitedReader: x.unlimitedReader
    })
});

logs.addEvent({
    type: "SetDapiName",
    alias: "sdn",
    options: {
        name: { describe: "Filter to dAPI name" },
        sender: { describe: "Filter to sender address" }
    },
    abi: "event SetDapiName(bytes32 indexed dapiName, bytes32 dataFeedId, address indexed sender)",
    filter: (args, f) => f.SetDapiName(args.name, null, args.sender),
    map: x => ({
        dapiName: x.dapiName,
        dataFeedId: x.dataFeedId,
        sender: x.sender
    })
});

logs.runCommand();