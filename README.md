coinbase-trader
===============

Node.js application to bypass buying limitations on Coinbase.

## Donations
You can send donations to: 1LQTXi1iWULMd4aKn5tKpcgT3xgJiTV5Dm

## Notes
Currently, only buy orders are supported.

## Instructions
You must first have node.js.

1. Clone the repo.
2. In the repo folder, run `npm install`
3. Edit config.js to provide your Coinbase API key.
4. Run `node trader.js`

You should now have a console to set up BTC buy orders.  They will remain open until the Coinbase limit is lifted, at which point they'll be filled normally.

Use `BUY <amount>` to purchase Bitcoins, and `SELL <amount>` to sell.  Orders will be retried at the configurable interval (default: 5 seconds) until filled.  Every 60 seconds, a report will be printed of outstanding orders.