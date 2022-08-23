# Airnode Tools

Command line utils for interacting with Airnode on chain.

- [RRP Logs](#rrp-logs-command): Search for Airnode RRP log events and dump to JSON or CSV.

## Setup

Install [NodeJS](https://nodejs.org/).

Clone this repo. Install the tools and dependencies globally from within the repo.

```sh
$ cd airnode-tools  # Go into the repo directory
$ npm install -g    # Install globally so you can use the commands from any directory
```

Update to the latest version by running git pull and then npm install again.

```sh
$ git pull        # Get the latest code
$ npm install -g  # Install the latest code
```

## RRP Logs Command

The `rrplogs` command searches a chain for Airnode RRP events and either prints them to the screen or writes them to a JSON or CSV file so that you can analyze them with other tools.

```
$ rrplogs --help

Usage: rrplogs <event type: full | template | fulfilled | failed | sponsor>

Commands:
  rrplogs full       Search for MadeFullRequest events
  rrplogs template   Search for MadeTemplateRequest events
  rrplogs fulfilled  Search for FulfilledRequest events
  rrplogs failed     Search for FailedRequest events
  rrplogs sponsor    Search for SetSponsorshipStatus events
  rrplogs networks   List all available networks

Options:
      --version  Show version number                                   [boolean]
  -n, --network  Network: ethereum, polygon, rsk, etc...
                                                  [string] [default: "ethereum"]
  -f, --from     From block number or ISO8601 date       [string] [default: "0"]
  -t, --to       To block number or ISO8601 date    [string] [default: "latest"]
  -b, --by       Number of blocks per query                             [number]
  -w, --wait     Seconds to wait between queries                        [number]
  -o, --output   Output file ending with .json or .csv                  [string]
      --help     Show help                                             [boolean]
```

See [this guide](https://consensys.net/blog/developers/guide-to-events-and-logs-in-ethereum-smart-contracts/) and the [ethers docs](https://docs.ethers.io/v5/concepts/events/) for introduction to Ethereum logs. The Airnode RRP events are specified in the [IAirnodeRrpV0](https://github.com/api3dao/airnode/blob/master/packages/airnode-protocol/contracts/rrp/interfaces/IAirnodeRrpV0.sol) interface.

### Event Types

The Airnode RRP event type to search for must be given. See the event type-specific options by putting --help after the event type.

```sh
$ rrplogs full --help      # Search for MadeFullRequest events
$ rrplogs template --help  # Search for MadeTemplateRequest events
$ rrplogs fulfilled --help # Search for FulfilledRequest events
$ rrplogs failed --help    # Search for FailedRequest events
$ rrplogs sponsor --help   # Search for SetSponsorshipStatus events

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
  "contract": "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd"
}
```

The `rpc` field can either be a URL string or a [ConnectionInfo](https://docs.ethers.io/v5/api/utils/web/#ConnectionInfo) object as accepted by the ethers [JsonRpcProvider](https://docs.ethers.io/v5/api/providers/jsonrpc-provider/#JsonRpcProvider) constructor. For example:

```json
{
  "name": "Ethereum Mainnet",
  "rpc": {
    "url": "https://myprivaterpc.com/v3/",
    "user": "myusername",
    "password": "MyPassword!!!"
  },
  "contract": "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd"
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
$ rrplogs full --by 1000000 --wait 2 # Wait 2 seconds between queries
```

### Output File

Specify the output file with --output (-o). By default events will be pretty-printed in the console as JSON but you can write them to a JSON or CSV file instead. The format is determined by the file extension.

```sh
$ rrplogs full --output full-requests.json  # Store results in a JSON file
$ rrplogs full --output full-requests.csv   # Store results in a CSV file
```

### Examples

Extract all full requests and responses on Ethereum into CSV files.

```sh
$ rrplogs full --output full-requests-eth.csv
$ rrplogs fulfilled -o fulfilled-requests-eth.csv
```

Extract full requests in the last 50000 blocks on Rinkeby into a JSON file.

```sh
$ rrplogs full --network rinkeby --from -50000 -o full-requests-rinkeby.json
```

Print full requests and responses on Polygon from block 30900000 to block 31000000 by querying evey 10000 blocks.

```sh
$ rrplogs full -n polygon --from 30900000 --to 31000000 --by 10000
$ rrplogs fulfilled -n polygon -f 30900000 -t 31000000 -b 10000
```

Print sponsorship events on BNB Chain on June 27th, 2022 (local time) by querying every 5000 blocks and waiting 5 seconds between each query.

```sh
$ rrplogs sponsor --network bnb --from 2022-06-27 --to 2022-06-28 --by 5000 --wait 5
```
