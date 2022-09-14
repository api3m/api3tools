# API3 Command Line Tools

Command line tools for interacting with API3 & Airnode on chain.

- [RRP Logs](#rrp-logs-command): Search for Airnode RRP log events and dump to JSON or CSV.
- [dAPI Logs](#dapi-logs-command): Search for dAPI log events and dump to JSON or CSV.

## Setup

1. Install [NodeJS](https://nodejs.org/).
2. Clone this repo.
3. Install the tools and dependencies globally from within the repo.

```sh
$ cd api3tools    # Go into the repo directory
$ npm install     # Install node modules locally
$ npm install -g  # Install commands globally so you can use them from any directory
```

Update to the latest version by running git pull and then npm install again.

```sh
$ git pull        # Get the latest code
$ npm update      # Update node modules locally
$ npm install -g  # Install any new commands globally
```

# Event Log Commands

## RRP Logs Command

The `rrplogs` command searches a chain for Airnode RRP events and either prints them to the screen or writes them to a JSON or CSV file so that you can analyze them with other tools.

```
$ rrplogs --help

Usage: rrplogs <event type | command>

Commands:
  rrplogs MadeFullRequest       Search                           [aliases: full]
  rrplogs MadeTemplateRequest   Search                       [aliases: template]
  rrplogs FulfilledRequest      Search                      [aliases: fulfilled]
  rrplogs FailedRequest         Search                         [aliases: failed]
  rrplogs SetSponsorshipStatus  Search                        [aliases: sponsor]
  rrplogs RequestedWithdrawal   Search                       [aliases: withdraw]
  rrplogs FulfilledWithdrawal   Search                       [aliases: withdrew]
  rrplogs all                   Search for all event types
  rrplogs networks              List all available networks
  rrplogs dates                 Add date column to CSV file

Options:
      --version  Show version number                                   [boolean]
  -n, --network  Network: ethereum, polygon, ...           [default: "ethereum"]
  -f, --from     From block number or ISO8601 date                [default: "0"]
  -t, --to       To block number or ISO8601 date             [default: "latest"]
  -b, --by       Number of blocks per query                             [number]
  -w, --wait     Seconds to wait between queries                        [number]
  -o, --output   json, csv, or file name ending with .json or .csv
      --help     Show help                                             [boolean]
```

See [this guide](https://consensys.net/blog/developers/guide-to-events-and-logs-in-ethereum-smart-contracts/) and the [ethers docs](https://docs.ethers.io/v5/concepts/events/) for introduction to Ethereum logs. The Airnode RRP events are specified in the [IAirnodeRrpV0](https://github.com/api3dao/airnode/blob/master/packages/airnode-protocol/contracts/rrp/interfaces/IAirnodeRrpV0.sol) interface. V0 is used because that's what is currently used in production for QRNG, etc... Eventually V1 will be added.

### Event Types

The main parameter is the Airnode RRP event type to search for. Either the full event type name or a shorter alias can be given. The examples below use aliases for brevity.

See event type-specific options by putting --help after the event type.

```sh
$ rrplogs full --help      # Search for MadeFullRequest events
$ rrplogs template --help  # Search for MadeTemplateRequest events
$ rrplogs fulfilled --help # Search for FulfilledRequest events
$ rrplogs failed --help    # Search for FailedRequest events
$ rrplogs sponsor --help   # Search for SetSponsorshipStatus events
```

Search for all event types with the `all` command. If the [output file](#output-file) is JSON they will all go in the same file. If the output file is CSV then a separate file will be created for each event type.

```sh
$ rrplogs all
```

### Network

Specify which network/chain to search with --network (-n). Each supported network has a config file in the networks folder that defaults to using a free RPC node. You can add/edit config files to configure your own RPC node or to add new networks.

```sh
$ rrplogs full --network polygon  # Search Polygon mainnet
$ rrplogs full -n goerli          # Search Goerli testnet
```

The `networks` command lists all available networks.

```sh
$ rrplogs networks
arbitrum: Arbitrum One
avalanche: Avalanche C-Chain
bnb: BNB Chain Mainnet
ethereum: Ethereum Mainnet
fantom: Fantom Opera Mainnet
gnosis: Gnosis Chain Mainnet
goerli: Goerli (Ethereum) Testnet
metis: Metis Andromeda Mainnet
milkomeda: Milkomeda C1 Mainnet
moonbeam: Moonbeam (Polkadot) Mainnet
moonriver: Moonriver (Kusama) Canary Net
mumbai: Mumbai (Polygon) Testnet
optimism: Optimism Mainnet
polygon: Polygon Mainnet
rinkeby: Rinkeby (Ethereum) Testnet
ropsten: Ropsten (Ethereum) Testnet
rsk: Rootstock (RSK) Mainnet
```

An example network config file is shown here.

```json
{
  "name": "Ethereum Mainnet",
  "rpc": "https://nodes.mewapi.io/rpc/eth",
  "contracts": {
    "rrp": "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd"
  }
}
```

The `rpc` field can either be a URL string or a [ConnectionInfo](https://docs.ethers.io/v5/api/utils/web/#ConnectionInfo) object as accepted by the ethers [JsonRpcProvider](https://docs.ethers.io/v5/api/providers/jsonrpc-provider/#JsonRpcProvider) constructor. For example:

```json
{
  "name": "Ethereum Mainnet",
  "rpc": {
    "url": "https://myprivaterpc.com/",
    "user": "myusername",
    "password": "MyPassword!!!"
  },
  "contracts": {
    "rrp": "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd"
  }
}
```

The `contract` field is the Airnode RRP contract address on that chain. See [here](https://docs.api3.org/airnode/v0.7/reference/airnode-addresses.html) for API3 deployed contracts.

### Block Range & Pagination

Limit the range of blocks searched with --from (-f) and --to (-t). By default the whole chain will be searched, from block 0 to the latest block. If you're using public/free RPC, you'll often need to limit the block range or your query will respond with an error.

```sh
$ rrplogs full --from 14698560 -to 14698562 # Search from block 14698560 to block 14698562
```

If --to is negative then it will be treated as an offset from the current block number. If --from is negative then it will be treated as an offset from --to.

```sh
$ rrplogs full --from -1000               # Search the last 1000 blocks
$ rrplogs full --to -1000                 # Search from block 0 up to the last 1000 blocks
$ rrplogs full --from -1000 --to 1000000  # Search blocks 999000 to 1000000
```

The --from and --to options can accept an ISO 8601 date/time string ([parsed by Moment.js](https://momentjs.com/docs/#/parsing/string/)) instead of a block number. The block after the date/time will be used for --from and the block before the date/time will be used for --to. If you only provide a date and omit the time part of the string then your local time zone is used.

```sh
$ rrplogs full --from 2022-01-01T00Z --to 2022-07-10T13:20:40Z      # From midnight Jan 1 to 1:20:40pm July 10 GMT
$ rrplogs full --from "2022-01-01 00Z" --to "2022-07-10 13:20:40Z"  # Same as above but with space instead of T (needs quotes)
$ rrplogs full --from 2022-01-01 --to 2022-07-10  # From midnight Jan 1 to midnight July 10 local time zone
```

Break the search up into multiple queries with --by (-b). By default the entire block range will be searched in a single query. Use --by when your RPC provider can't handle such a large range and you need to use multiple queries.

```sh
$ rrplogs full --from 10000000 --to 14698562 --by 1000000  # Search range with queries of 1000000 blocks
$ rrplogs full --by 2000000                                # Search the whole chain with queries of 2000000 blocks
```

If the RPC provider is enforcing a rate limit in addition to limiting the block range then use --wait (-w) to wait some number of seconds between queries. The --wait option only applies when also using the --by option.

```sh
$ rrplogs full --by 1000000 --wait 2  # Wait 2 seconds between queries
```

### Output File

Specify the output file with --output (-o). By default, events will be pretty-printed in the console as JSON but you can write them to a JSON or CSV file instead. If just json or csv are given then a default file name will be used. If a file name ending in .json or .csv are given then the format is determined by the file extension.

```sh
$ rrplogs full --output json  # Store results as JSON in default file name
$ rrplogs full --output csv   # Store results as CSV in default file name
$ rrplogs full --output full-requests.json  # Store results as JSON in full-requests.json
$ rrplogs full --output full-requests.csv   # Store results as CSV in full-requests.csv
```

### Adding Dates

Unfortunately, EVM events don't come with a date or time. The log data only has the block number. We can get the date of each block by making a seperate query but doing so is incredibly slow and inefficient using remote queries. Use the `dates` command to efficiently add a date column to a CSV file already saved from a previous rrplogs command.

Provide the CSV file from a previously-run rrplogs command with --input (-i). Specify the network with --network (-n) and the output file with --output (-o) as usual. Make sure the network is the same as was used to create the input file. Otherwise the block numbers will not make sense.

```sh
$ rrplogs full --network rinkeby --output full-requests.csv  # Create the log file containing block numbers
$ rrplogs dates --network rinkeby --input full-requests.csv --output full-requests-with-dates.csv  # Add a date column
```

### RRP Logs Examples

##### Example: Full Requests & Responses

Extract all full requests and responses on Ethereum into CSV files.

```sh
$ rrplogs full --output csv
$ rrplogs fulfilled -o csv
```

##### Example: All Events

Extract all events on Ethereum into JSON and CSV files.

```sh
$ rrplogs all --output json
$ rrplogs all --output csv
```

##### Example: Recent Full Requests

Extract full requests in the last 50000 blocks on Rinkeby into a JSON file.

```sh
$ rrplogs full --network rinkeby --from -50000 -o json
```

#### Example: From Block To Block By

Print full requests and responses on Polygon from block 30900000 to block 31000000 by querying evey 10000 blocks.

```sh
$ rrplogs full -n polygon --from 30900000 --to 31000000 --by 10000
$ rrplogs fulfilled -n polygon -f 30900000 -t 31000000 -b 10000
```

#### Example: From Date To Date

Print full requests on Ropsten from May 3rd, 2022 (UTC time) to the end of May (UTC time).

```sh
$ rrplogs full --network ropsten --from 2022-05-03T00Z --to 2022-06-01T00Z
```

#### Example: On Date By Wait

Print sponsorship events on BNB Chain on June 27th, 2022 (local time) by querying every 5000 blocks and waiting 5 seconds between each query.

```sh
$ rrplogs sponsor --network bnb --from 2022-06-27 --to 2022-06-28 --by 5000 --wait 5
```

#### Example: Combine Networks

Combine CSV files created from different networks into a single file. Only combine files with the same event types because different event types have different columns. (Uses [xsv](https://github.com/BurntSushi/xsv/blob/master/README.md))

```sh
$ rrplogs full --network rinkeby --output rinkeby.csv  # Get full requests from rinkeby
$ rrplogs full --network ropsten --output ropsten.csv  # Get full requests from ropsten
$ rrplogs full --network goerli --output goerli.csv    # Get full requests from goerli
$ rrplogs full --network kovan --output kovan.csv      # Get full requests from kovan
$ xsv cat rows rinkeby.csv ropsten.csv goerli.csv kovan.csv > combined.csv  # Combine them into one file
$ xsv table combined.csv | less -S                     # See the results
```

#### Example: Combine Networks Sort By Date

Combine CSV files created from different networks into a single file sorted by date. (Uses [xsv](https://github.com/BurntSushi/xsv/blob/master/README.md))

```sh
$ rrplogs full --network rinkeby --output rinkeby.csv              # Get full requests from rinkeby
$ rrplogs dates -n rinkeby -i rinkeby.csv -o rinkeby-dated.csv     # Add a date column
$ rrplogs full --network ropsten --output ropsten.csv              # Get full requests from ropsten
$ rrplogs dates -n ropsten -i ropsten.csv -o ropsten-dated.csv     # Add a date column
$ xsv cat rows rinkeby-dated.csv ropsten-dated.csv > combined.csv  # Combine them into one file
$ xsv sort -s date combined.csv > sorted.csv                       # Sort it by date
$ xsv table sorted.csv | less -S                                   # See the results
```

## dAPI Logs Command

The `dapilogs` command searches a chain for dAPI events and either prints them to the screen or writes them to a JSON or CSV file so that you can analyze them with other tools. It works very much like `rrplogs` so [get familar with rrplogs](#rrp-logs-command) first.

```
$ dapilogs --help

Usage: dapilogs <event type | command>

Commands:
  dapilogs                                  Search
  SetRrpBeaconUpdatePermissionStatus                       [aliases: permission]
  dapilogs RequestedRrpBeaconUpdate         Search          [aliases: requested]
  dapilogs RequestedRrpBeaconUpdateRelayed  Search            [aliases: relayed]
  dapilogs UpdatedBeaconWithRrp             Search         [aliases: updatedrrp]
  dapilogs                                  Search
  RegisteredBeaconUpdateSubscription                     [aliases: subscription]
  dapilogs UpdatedBeaconWithPsp             Search         [aliases: updatedpsp]
  dapilogs UpdatedBeaconWithSignedData      Search      [aliases: updatedsigned]
  dapilogs UpdatedBeaconSetWithBeacons      Search  [aliases: updatedsetbeacons]
  dapilogs UpdatedBeaconSetWithSignedData   Search   [aliases: updatedsetsigned]
  dapilogs AddedUnlimitedReader             Search          [aliases: unlimited]
  dapilogs SetDapiName                      Search           [aliases: namedapi]
  dapilogs ExtendedWhitelistExpiration      Search           [aliases: extwlexp]
  dapilogs SetWhitelistExpiration           Search           [aliases: setwlexp]
  dapilogs SetIndefiniteWhitelistStatus     Search       [aliases: setindwlstat]
  dapilogs                                  Search
  RevokedIndefiniteWhitelistStatus                       [aliases: revindwlstat]
  dapilogs all                              Search for all event types
  dapilogs networks                         List all available networks
  dapilogs dates                            Add date column to CSV file

Options:
      --version  Show version number                                   [boolean]
  -n, --network  Network: ethereum, polygon, ...           [default: "ethereum"]
  -f, --from     From block number or ISO8601 date                [default: "0"]
  -t, --to       To block number or ISO8601 date             [default: "latest"]
  -b, --by       Number of blocks per query                             [number]
  -w, --wait     Seconds to wait between queries                        [number]
  -o, --output   json, csv, or file name ending with .json or .csv
      --help     Show help                                             [boolean]
```

The dAPI events are specified in the [IDapiServer](https://github.com/api3dao/airnode-protocol-v1/blob/main/contracts/dapis/interfaces/IDapiServer.sol) and [IWhitelistWithManager](https://github.com/api3dao/airnode-protocol-v1/blob/main/contracts/whitelist/interfaces/IWhitelistWithManager.sol) interfaces. See event type-specific options by putting --help after the event type.

```sh
$ dapilogs requested --help      # Search for RequestedRrpBeaconUpdate events
$ dapilogs updatedsigned --help  # Search for UpdatedBeaconWithSignedData events
...
```

[Event types](#event-types), [networks](#network), [range limitinig & paginaton](#block-range--pagination), and [output](#output-file) work exacly like `rrplogs`. See details in the `rrplogs` docs above.

Network files can provide the DapiServer address in a `dapi` contracts entry. For example:

```json
{
  "name": "BNB Chain Mainnet",
  "rpc": "https://bsc-dataseed.binance.org",
  "contracts": {
    "rrp": "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd",
    "dapi": "0x8B0A67D060C86919Ae76Ca3FA69c68Ff98E85c3c"
  }
}
```

The networks available for `dapilogs` are limited to those with a `dapi` contract entry.

```sh
$ dapilogs networks
avalanche: Avalanche C-Chain
bnb: BNB Chain Mainnet
milkomeda: Milkomeda C1 Mainnet
mumbai: Mumbai (Polygon) Testnet
polygon: Polygon Mainnet
rsk: Rootstock (RSK) Mainnet
```

### dAPI Logs Examples

#### dAPI Example: Recent To CSV

Extract all events from the last 100000 blocks on Mumbai to CSV files.

```sh
$ dapilogs all -n mumbai -f -100000 -b 1000 -o csv
```

#### dAPI Example: Update Signed On Date

Extract UpdatedBeaconWithSignedData events from Mumbai on August 23rd (local time). In the first example we extract all of them. In the second example we filter to only get [Amberdata BTC/USD 5-min spot VWAP](https://market.api3.org/beacons/polygon/0x0dc124b07cc935112d87b49c806c5c880659dd7a2ef75b4ea04460cf224ea2c0) updates.

```sh
$ dapilogs updatedsigned -n mumbai -f 2022-08-23 -t 2022-08-24 -b 1000 -o csv # Get all signed updates
$ dapilogs updatedsigned --beacon 0x0dc124b07cc935112d87b49c806c5c880659dd7a2ef75b4ea04460cf224ea2c0 -n mumbai -f 2022-08-23 -t 2022-08-24 -b 1000 -o mumbai-btc-usd-signed-updates.csv # Only get signed updates with the given beacon ID
```
