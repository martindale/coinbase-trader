var rest = require('restler')
  , repl = require('repl')
  , config = require('./config')
  , fs = require('fs');

var red = '\u001b[31m'
  , bold = '\u001b[1m'
  , reset = '\u001b[0m';

var orders = {};
var market = {
  rates: {}
};

// always start with good exchange rates.
rest.get('https://coinbase.com/api/v1/currencies/exchange_rates').on('complete', function(data, res) {
  market.rates = data;
});

writeLog(bold + 'Welcome to BitCoin Trader.' + 
  reset + 
  '\nCommand-line console for buying and selling BitCoins.\n\n' +
  '     Syntax: BUY <amount> [currency]\n' + 
  '    Example: BUY 10\n\n' +
  '     Syntax: BUYLIMIT <amount> <exchangerate> <currency>\n' +
  '    Example: BUYLIMIT 10 100 USD\n\n' +
  '     Syntax: SELL <amount> [currency]\n' +
  '    Example: SELL 10\n\n' +
  '     Syntax: SELLLIMIT <amount> <exchangerate> <currency>\n' +
  '    Example: SELLLIMIT 10 100 USD\n\n' +
  'If a currency is provided (USD, EUR, etc.), the order will buy as many BTC as the <amount> provides at the current exchange rates, updated once per 60 seconds.\n');

repl.start({
    prompt: 'coinbase> '
  , eval: function(cmd, context, filename, callback) {

      var tokens = cmd.toLowerCase().replace('(','').replace(')','').replace('\n', '').split(' ');
      var instruction = tokens[0];
      var amount = parseFloat(tokens[1]);
      var orderID = new Date().toString();
      var denomination = 'BTC';

      if (!amount) {
        writeLog('No amount specified.');
      } else {
        switch (tokens[0]) {
          case 'buy':

            if (typeof(tokens[2]) != 'undefined') {
              denomination = tokens[2].toUpperCase();
            }

            if (denomination != 'BTC') {
              var originalCurrency = amount;
              var rate = getRate(denomination);
              if (rate != null) {

                orders[ orderID ] = {
                    type: 'buy'
                  , amount: amount
                  , denomination: denomination
                  , agent: setTimeout(function() {
                      executeOrder( orderID );
                    }, 1) // issue order immediately.
                };

                amount = (amount - 0.15) / ( 1.01 * rate);

                writeLog('Order to BUY ' + tokens[1] + ' ' + denomination + ' worth of BTC queued @ ' + rate + ' BTC/' + denomination + ' (' + amount + ' BTC)' );
              
              } else {
                writeLog('No known exchange rate for BTC/' + denomination + '. Order failed.');
              }

            } else {

              orders[ orderID ] = {
                  type: 'buy'
                , amount: amount
                , denomination: denomination
                , agent: setTimeout(function() {
                    executeOrder( orderID );
                  }, 1) // issue order immediately.
              };

              writeLog('Order to BUY ' + tokens[1] + ' BTC queued.');
            }

          break;
          case 'buylimit':

            var limit = parseFloat(tokens[2]);

            if (typeof(tokens[3]) != 'undefined') {
              denomination = tokens[3].toUpperCase();
            } else {
              writeLog('Must specify a currency denomination. Order failed.');
              break;
            }

            var rate = getRate(denomination);
            if (rate != null) {

              // Only execute the order if the rate is less than the limit
              var limitagent = null;

              if (rate <= limit) {
                limitagent = setTimeout(function() { executeOrder( orderID ); }, 1);
              }

              orders[ orderID ] = {
                  type: 'buylimit'
                , amount: amount
                , denomination: 'BTC' // Always buy in terms of BTC
                , agent: limitagent
                , limit: limit
                , limitdenomination: denomination
              };

              writeLog('Order to BUY ' + tokens[1] + ' BTC @ ' + limit + ' BTC/' + denomination + ' or less ' + ((rate <= limit) ? 'EXECUTING' : 'QUEUED') );
            
            } else {
              writeLog('No known exchange rate for BTC/' + denomination + '. Order failed.');
            }

          break;
          case 'sell':
            if (typeof(tokens[2]) != 'undefined') {
              denomination = tokens[2].toUpperCase();
            }

            if (denomination != 'BTC') {
              var originalCurrency = amount;
              var rate = getRate(denomination);
              if (rate != null) {

                orders[ orderID ] = {
                    type: 'sell'
                  , amount: amount
                  , denomination: denomination
                  , agent: setTimeout(function() {
                      executeOrder( orderID );
                    }, 1) // issue order immediately.
                };

                amount = (amount - 0.15) / ( 1.01 * rate);

                writeLog('Order to SELL ' + tokens[1] + ' ' + denomination + ' worth of BTC queued @ ' + rate + ' BTC/' + denomination + ' (' + amount + ' BTC)' );
              
              } else {
                writeLog('No known exchange rate for BTC/' + denomination + '. Order failed.');
              }

            } else {

              orders[ orderID ] = {
                  type: 'sell'
                , amount: amount
                , denomination: denomination
                , agent: setTimeout(function() {
                    executeOrder( orderID );
                  }, 1) // issue order immediately.
              };

              writeLog('Order to SELL ' + tokens[1] + ' BTC queued.');
            }
          break;
          case 'selllimit':

            var limit = parseFloat(tokens[2]);

            if (typeof(tokens[3]) != 'undefined') {
              denomination = tokens[3].toUpperCase();
            } else {
              writeLog('Must specify a currency denomination. Order failed.');
              break;
            }

            var rate = getRate(denomination);
            if (rate != null) {

              // Only execute the order if the rate is more than the limit
              var limitagent = null;

              if (rate >= limit) {
                limitagent = setTimeout(function() { executeOrder( orderID ); }, 1);
              }

              orders[ orderID ] = {
                  type: 'selllimit'
                , amount: amount
                , denomination: 'BTC' // Always sell in terms of BTC
                , agent: limitagent
                , limit: limit
                , limitdenomination: denomination
              };

              writeLog('Order to SELL ' + tokens[1] + ' BTC @ ' + limit + ' BTC/' + denomination + ' or more ' + ((rate >= limit) ? 'EXECUTING' : 'QUEUED') );
            
            } else {
              writeLog('No known exchange rate for BTC/' + denomination + '. Order failed.');
            }

          break;
          default:
            writeLog('unknown command: "' + cmd + '"');
          break;
        }
      }

    }
});

// Regularly show current order status.
setInterval(function() {

  rest.get('https://coinbase.com/api/v1/currencies/exchange_rates').on('complete', function(data, res) {
    if (res.statusCode == 200) {
      market.rates = data;
    }
  });

  writeLog('');
  writeLog('=== CURRENT BTC/USD: ' + market.rates.btc_to_usd + ' ===');
  writeLog('=== CURRENT ORDERS ===');

  Object.keys(orders).forEach(function(orderID) {
    var order = orders[ orderID ];
    writeLog(order.type.toUpperCase() + ' ' + order.amount + ((order.type === 'buylimit' || order.type === 'selllimit') ? ' @ ' + order.limit + ' BTC/' + order.limitdenomination : ''));

    // Submit limit orders if necessary
    if (order.type === 'buylimit') {
      var rate = getRate(order.limitdenomination);
      if (rate != null && rate <= order.limit) {
        order.agent = setTimeout(function() { executeOrder(orderID); }, 1);
      }
    } else if (order.type === 'selllimit') {
      var rate = getRate(order.limitdenomination);
      if (rate != null && rate >= order.limit) {
        order.agent = setTimeout(function() { executeOrder(orderID); }, 1);
      }
    }
  });
}, 60000);

function getRate(denomination) {
  var rate = market.rates[ 'btc_to_' + denomination.toLowerCase() ];
  if (typeof(rate) != 'undefined') {
    return rate;
  } else {
    return null;
  }
}

function writeLog(str) {
  fs.appendFileSync(config.coinbase.logfile, str + '\n');
  console.log(str);
}

function executeOrder(orderID) {
  var order = orders[ orderID ];
  var amount = parseFloat(order.amount);

  if (order.denomination != 'BTC') {
    var originalCurrency = amount;
    var rate = getRate(order.denomination);
    if (rate != null) {
      amount = (amount - 0.15) / (1.01 * rate);
    } else {
      writeLog('No known exchange rate for BTC/' + order.denomination + '. Order failed.')
      return;
    }
  }

  switch(order.type) {
    case 'buylimit':
    case 'buy':
      writeLog('Attempting to buy ' + amount + ' BTC...');

      if (config.debug) { writeLog(JSON.stringify(orders[orderID])); }
      rest.postJson('https://coinbase.com/api/v1/buys?api_key=' + config.coinbase.key, {
        qty: amount
      }).on('complete', function(data, res) {
        if (config.debug) { writeLog(data); }

        clearTimeout(orders[orderID].agent);

        if (!data.success) {
          if (order.type === 'buy') {
            orders[orderID].agent = setTimeout(function() { executeOrder(orderID); }, config.coinbase.rate);
          } else if (order.type === 'buylimit') {
            // See if the market rate is still good for this limit order
            var rate = getRate(order.limitdenomination);
            if (rate != null && rate <= order.limit) {
              orders[orderID].agent = setTimeout(function() { executeOrder(orderID); }, config.coinbase.rate);
            }
          }
        } else {
          delete orders[orderID];
          writeLog('BUY ' + amount + ' BTC filled for a total of ' + data.transfer.total.amount + ' ' + data.transfer.total.currency + '.');
        }

      });

    break;
    case 'sell':
    case 'selllimit':
      writeLog('Attempting to sell ' + amount + ' BTC...')

      if (config.debug) { writeLog(JSON.stringify(orders[orderID])); }
      rest.postJson('https://coinbase.com/api/v1/sells?api_key=' + config.coinbase.key, {
        qty: amount
      }).on('complete', function(data, res) {
        if (config.debug) { writeLog(data); }

        clearTimeout(orders[orderID].agent);

        if (!data.success) {
          if (order.type == 'sell') {
            orders[orderID].agent = setTimeout(function() { executeOrder(orderID); }, config.coinbase.rate);
          } else if (order.type === 'selllimit') {
            // See if the market rate is still good for this limit order
            var rate = getRate(order.limitdenomination);
            if (rate != null && rate >= order.limit) {
              orders[orderID].agent = setTimeout(function() { executeOrder(orderID); }, config.coinbase.rate);
            }
          }
        } else {
          delete orders[orderID];
          writeLog('SELL ' + amount + ' BTC filled for a total of ' + data.transfer.total.amount + ' ' + data.transfer.total.currency + '.')
        }
      });
    break;
  }

}