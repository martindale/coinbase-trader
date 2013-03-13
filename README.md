coinbase-trader
===============

Node.js application to bypass buying limitations on Coinbase.

![Example Bitcoin Trader](http://i.imgur.com/I65OwDh.png)

## Instructions
You must first have node.js and [an API key from Coinbase](https://coinbase.com/docs/api/overview).  The button you'll need is a little ways down on the page:

![API key enabled](http://i.imgur.com/0YHPqhU.png)

1. Clone the repo.
2. In the repo folder, run `npm install`
3. Edit config.js to provide your Coinbase API key.
4. Run `node trader.js`

You should now have a console to set up BTC buy orders.  They will remain open until the Coinbase limit is lifted, at which point they'll be filled normally.

Use `BUY <amount>` to purchase Bitcoins, and `SELL <amount>` to sell.  Orders will be retried at the configurable interval (default: 5 seconds) until filled.  Every 60 seconds, a report will be printed of outstanding orders.

Use `BUY <amount> [currency]` to buy as many Bitcoin as possible using `<amount>` of `[currency]` at the current exchange rates, updated once per 60 seconds.  Coinbase fees are included in the calculations, but fluctuating prices can result in slight over and under spends.

## Notes
Currently, only buy orders are supported.

## Donations
You can send donations to: 1LQTXi1iWULMd4aKn5tKpcgT3xgJiTV5Dm


