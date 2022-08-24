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
    type: "UpdatedBeaconWithSignedData",
    alias: "ubwsd",
    options: {
        id: { describe: "Filter to beacon ID" }
    },
    abi: "event UpdatedBeaconWithSignedData(bytes32 indexed beaconId, int256 value, uint256 timestamp)",
    filter: (args, f) => f.UpdatedBeaconWithSignedData(args.id, null, null),
    map: x => ({
        beaconId: x.beaconId,
        value: x.value.toHexString(),
        timestamp: x.timestamp.toNumber()
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