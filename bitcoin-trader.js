var rest = require('restler')
  , repl = require('repl')
  , config = require('./config');

var orders = {};

console.log('Welcome to Bitcoin Trader.\nUse BUY <amount> to buy BTC, SELL <amount> to sell.\nExample: BUY 10');

repl.start({
    prompt: 'coinbase> '
  , eval: function(cmd, context, filename, callback) {

      var tokens = cmd.toLowerCase().replace('(','').replace(')','').replace('\n', '').split(' ');
      var amount = tokens[1];
      var orderID = new Date().toString();

      if (!amount) {
        callback('No amount specified.');
      } else {
        switch (tokens[0]) {
          case 'buy':
            orders[ orderID ] = {
                type: 'buy'
              , amount: amount
              , agent: setTimeout(function() {
                  executeOrder( orderID );
                }, 1) // issue order immediately.
            };
            callback('Order to BUY ' + tokens[1] + ' BTC queued.');
          break;
          case 'sell':
            callback('Order to SELL ' + tokens[1] + ' BTC queued.');
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
  console.log('=== CURRENT ORDERS ===');
  Object.keys(orders).forEach(function(orderID) {
    var order = orders[ orderID ];
    console.log(orderID + ' : ' + order.type.toUpperCase() + ' ' + order.amount + ' : UNFILLED');
  });
}, 60000);

function executeOrder(orderID) {
  var order = orders[ orderID ];
  var amount = parseFloat(order.amount);

  switch(order.type) {
    case 'buy':
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