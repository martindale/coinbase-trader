var rest = require('restler')
  , repl = require('repl')
  , config = require('./config');

var orders = {};
var market = {
  rates: {}
};

// always start with good exchange rates.
rest.get('https://coinbase.com/api/v1/currencies/exchange_rates').on('complete', function(data, res) {
  market.rates = data;
});

console.log('Welcome to Bitcoin Trader.\nUse BUY <amount> to buy BTC, SELL <amount> to sell.\nExample: BUY 10');

repl.start({
    prompt: 'coinbase> '
  , eval: function(cmd, context, filename, callback) {

      var tokens = cmd.toLowerCase().replace('(','').replace(')','').replace('\n', '').split(' ');
      var amount = parseFloat(tokens[1]);
      var orderID = new Date().toString();
      var denomination = 'BTC';

      if (typeof(tokens[2]) != 'undefined') {
        denomination = tokens[2].toUpperCase();
      }

      if (!amount) {
        callback('No amount specified.');
      } else {
        switch (tokens[0]) {
          case 'buy':
            orders[ orderID ] = {
                type: 'buy'
              , amount: amount
              , denomination: denomination
              , agent: setTimeout(function() {
                  executeOrder( orderID );
                }, 1) // issue order immediately.
            };

            if (denomination != 'BTC') {
              var originalCurrency = amount;
              var rate = market.rates[ 'btc_to_' + denomination.toLowerCase() ];
              amount = (amount - 0.15) / ( 1.01 * rate);

              callback('Order to BUY ' + tokens[1] + ' ' + denomination + ' worth of BTC queued @ ' + rate + ' BTC/' + denomination + ' (' + amount + ' BTC)' );
            } else {
              callback('Order to BUY ' + tokens[1] + ' BTC queued.');
            }

            
          break;
          case 'sell':
            callback('Order to SELL ' + tokens[1] + ' ' + denomination + ' queued.');
          break;
          default:
            console.log('unknown command: "' + cmd + '"');
          break;
        }
      }

    }
});

// Regularly show current order status.
setInterval(function() {

  rest.get('https://coinbase.com/api/v1/currencies/exchange_rates').on('complete', function(data, res) {
    market.rates = data;
  });

  console.log('=== CURRENT ORDERS ===');
  Object.keys(orders).forEach(function(orderID) {
    var order = orders[ orderID ];
    console.log(orderID + ' : ' + order.type.toUpperCase() + ' ' + order.amount + ' : UNFILLED');
    console.log('Current USD to BTC exchange rate: ' + market.rates.usd_to_btc);
  });
}, 60000);

function executeOrder(orderID) {
  var order = orders[ orderID ];
  var amount = parseFloat(order.amount);

  if (order.denomination != 'BTC') {
    var originalCurrency = amount;
    amount = (amount - 0.15) / ( 1.01 * market.rates[ 'btc_to_' + order.denomination.toLowerCase() ]);
    /* console.log('at current rate, ' + originalCurrency + ' ' + order.denomination + ' will buy ' + amount + ' BTC.'); */
  }

  switch(order.type) {
    case 'buy':
      console.log('Attempting to buy ' + amount + ' BTC...');
      rest.postJson('https://coinbase.com/api/v1/buys?api_key=' + config.coinbase.key, {
        qty: amount
      }).on('complete', function(data, res) {
        if (config.debug) { console.log(data); }

        if (!data.success) {
          orders[ orderID ].agent = setTimeout(function() {
            executeOrder( orderID );
          }, config.coinbase.rate);
        } else {
          clearTimeout( orders[ orderID ].agent );
          delete orders[ orderID ];
          console.log('BUY ' + amount + ' BTC filled.');
        }

      });
    break;
  }

}