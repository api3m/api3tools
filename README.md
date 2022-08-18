# Airnode Tools

Command line utils for interacting with Airnode on chain.

## Setup

Install the commands and the required node modules globally.

```sh
$ npm -g install
```

## RRP Events Command

The rrp-events command queries a chain for Airnode RRP events and prints them to stdout as either JSON or CSV so that you can analyze them with other tools. Redirect the output to a file as needed.

```sh
$ rrp-events --help
```

### Event Types

The Airnode RRP event type to query for must be given. See the event type-specific options by putting --help after the event type.

```sh
$ rrp-events full --help      # Query MadeFullRequest events
$ rrp-events template --help  # Query MadeTemplateRequest events
$ rrp-events fulfilled --help # Query FulfilledRequest events
$ rrp-events failed --help    # Query FailedRequest events
$ rrp-events sponsor --help   # Query SetSponsorshipStatus events

```

### Network

Specify which chain/network with -n (--network). Each supported network has a config file in the networks folder that defaults to using a free RPC node. You can add/edit config files to configure your own RPC node or to add new networks.

```sh
$ rrp-events -n polygon full
```

### Block Range

Limit the range of blocks searched with -f (--from-block) and -t (--to-block). By default the whole chain will be searched, from block 0 to the latest block.

```sh
$ rrp-events -f 14698560 -t 14698562 full
```

### Output Format

Specify the output format with -o (--output-format). By default events will be pretty-printed for the console as JSON but you can change that to raw JSON or CSV.

```sh
$ rrp-events -o json full > airnode-full-requests.json
$ rrp-events -o csv full > airnode-full-requests.csv
```
