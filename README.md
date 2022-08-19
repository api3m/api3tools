# Airnode Tools

Command line utils for interacting with Airnode on chain.

## Setup

Install the commands and dependencies globally.

```sh
$ npm -g install
```

## RRP Events Command

The rrp-events command searches a chain for Airnode RRP events and either prints them to the terminal or writes them to a JSON or CSV file so that you can analyze them with other tools.

```sh
$ rrp-events --help
```

### Event Types

The Airnode RRP event type to search for must be given. See the event type-specific options by putting --help after the event type.

```sh
$ rrp-events full --help      # Query MadeFullRequest events
$ rrp-events template --help  # Query MadeTemplateRequest events
$ rrp-events fulfilled --help # Query FulfilledRequest events
$ rrp-events failed --help    # Query FailedRequest events
$ rrp-events sponsor --help   # Query SetSponsorshipStatus events

```

### Network

Specify which network/chain to search with -n (--network). Each supported network has a config file in the networks folder that defaults to using a free RPC node. You can add/edit config files to configure your own RPC node or to add new networks.

```sh
$ rrp-events --network polygon full -f 31471066 -t 31481066
```

The `networks` command lists all available networks.

```sh
$ rrp-events networks
arbitrum: Arbitrum One
avalanche: Avalanche C-Chain
bnb: BNB Chain Mainnet
ethereum: Ethereum Mainnet
fantom: Fantom Opera Mainnet
gnosis: Gnosis Chain Mainnet
metis: Metis Andromeda Mainnet
milkomeda: Milkomeda C1 Mainnet
moonbeam: Moonbeam (Polkadot) Mainnet
moonriver: Moonriver (Kusama) Canary Net
optimism: Optimism Mainnet
polygon: Polygon Mainnet
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
    "url": "https://mainnet.infura.io/v3/",
    "user": "myusername",
    "password": "MyPassword!!!"
  },
  "contract": "0xa0AD79D995DdeeB18a14eAef56A549A04e3Aa1Bd"
}
```

The `contract` field is the Airnode RRP contract address on that chain. See [here](https://docs.api3.org/airnode/v0.7/reference/airnode-addresses.html) for API3 deployed contracts.

### Block Range & Pagination

Limit the range of blocks searched with -f (--from) and -t (--to). By default the whole chain will be searched, from block 0 to the latest block. If you're using public/free RPC, you'll often need to limit the block range or the query will respond with an error.

```sh
$ rrp-events full --from 14698560 -to 14698562
```

Break the search up into multiple queries with -b (--by). By default the entire block range will be searched in a single query. Use -b when your RPC provider can't handle such a large range and you need to use multiple queries.

```sh
$ rrp-events full --from 10000000 --to 14698562 --by 1000000
$ rrp-events full --by 2000000
```

### Output File

Specify the output file with -o (--output). By default events will be pretty-printed in the console as JSON but you can write them to a JSON or CSV file instead. The format is based on the file extension.

```sh
$ rrp-events full --output airnode-full-requests.json
$ rrp-events full --output airnode-full-requests.csv
```
