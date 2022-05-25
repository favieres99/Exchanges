API_Public_Key = { }
API_Private_Key = { }

function GEM_PrivateRequest(gemrequest, limit_trades, time_stamp) {
  function HMACSHA384HEX(s, secret) { return ToHex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, s, secret)).toString(); }
  function ToHex(s) { return s.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');  }
  function stringToBase64(s) { return (Utilities.base64Encode(s)); }
  
  if (limit_trades && time_stamp)
    gemrequest.payload = {"request": gemrequest.version + gemrequest.command + gemrequest.payload, "nonce": new Date().getTime(), "limit_trades" : limit_trades, "timestamp" : time_stamp};
  else if (limit_trades)
    gemrequest.payload = {"request": gemrequest.version + gemrequest.command + gemrequest.payload, "nonce": new Date().getTime(), "limit_trades" : limit_trades};
  else
   gemrequest.payload = {"request": gemrequest.version + gemrequest.command + gemrequest.payload, "nonce": new Date().getTime()};
  var params = {
    'method'               : gemrequest.method,
    'muteHttpExceptions'   : true,
    'Content-Type'         : "text/plain",
    'headers': {
      "X-GEMINI-APIKEY"    : gemrequest.apikey,
      "X-GEMINI-PAYLOAD"   : stringToBase64(JSON.stringify(gemrequest.payload)),
      "X-GEMINI-SIGNATURE" : HMACSHA384HEX(stringToBase64(JSON.stringify(gemrequest.payload)), gemrequest.secret),
      "Cache-Control"      : "no-cache"
     }
  }
  return  { uri: gemrequest.uri + gemrequest.version + gemrequest.command, params: params};
}

function Type_of_request(type){
  var gemrequest = {
  'apikey'   : 'account-o4SsTgmotFbGcwo201h6',
  'secret'   : 'TcfT4GNwY7JKHjaA3Cba6V6hAgH',
  'uri'      : 'https://api.gemini.com',
  'version'  : '/v1/',
  'command'  : type,
  'method'   : 'post',
  'payload'  : ''
  };
  return gemrequest
}

function Volcador(acc_json, type, headings){
  var outputRows = []
  // Loop through each member
  acc_json.forEach(function(member) { outputRows.push(headings.map(function(heading) { return member[heading] || '' } )) })
  // Write to sheets
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(type)
  sheet.clear()
  if (outputRows.length) {
    // Add the headings - delete this next line if headings not required
    outputRows.unshift(headings)
    sheet.getRange(1, 1, outputRows.length, outputRows[0].length).setValues(outputRows)
  }
}

function GEM_PastTrades(type){
  var limit_trades = 500 //Valor maximo de trades que sse puede sacar de una tacada === 500
  var time_stamp = 1 // tiene que ser minimo 1 para que haga el bucle, si no enseñas los ultimos. EN CASO DE HABER MENOS DE 500 TRADES DESDE EL TIME PEDIDO SI QUE LOS COLOCA ORDENADOS EN EL EXCEL, AL NO HABER VARIOS BLOQUES DE INFORMACION SOLICITADOS
  var headings = ['price', 'amount', 'timestamp', 'timestampms', 'type', 'aggressor', 'fee_currency', 'fee_amount', 'tid', 'order_id', 'exchange', 'is_auction_fill', 'is_clearing_fill', 'symbol']
  var outputRows = []
  while (time_stamp == 1 || acc_pastrades_json.length){ //hace falta la doble condicion porque al principio no hay length
    var response = GEM_PrivateRequest(Type_of_request(type), limit_trades, time_stamp)
    var acc_pastrades_json= JSON.parse(UrlFetchApp.fetch(response.uri, response.params), function (key,value){
      if (key == 'is_clearing_fill' || key == 'is_auction_fill' || key == 'aggressor') { if(value) {return 'true'} else {return 'false'}}
      else if (key == 'price' || key == 'tid' || key == 'amount' || key == 'timestampms' || key == 'timestamps' || ( key == 'fee_amount' && value != 0)) {return Number(value)}
      else { return value }
    })
    // Loop through each member
    acc_pastrades_json.forEach(function(member) { outputRows.push(headings.map(function(heading) { return member[heading] || '' } )) })
    // Este if es por cuando devuelve el ultimo json vacio, para que no lea algo que no existe
    if (acc_pastrades_json.length){
      var highest_time = acc_pastrades_json[0].timestamp
      time_stamp = highest_time + 1
    }
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("PastTrades")
  sheet.clear()
  outputRows.unshift(headings)
  sheet.getRange(1, 1, outputRows.length, outputRows[0].length).setValues(outputRows)
}

function GEM_Balance(type) {
  var response = GEM_PrivateRequest(Type_of_request(type), 0, 0)
  var acc_balances_json= JSON.parse(UrlFetchApp.fetch(response.uri, response.params), function(key, value){
    if (key == 'amount' || key == 'amountNotional') {return Number(value)}
    else if ((key == 'availableForWithdrawal' || key == 'availableForWithdrawalNotional') && value != 0) {return Number(value)}
    else {return value}
  })
  // Headings in the column order that you wish the table to appear.
  var headings = ['currency', 'amount', 'amountNotional', 'availableForWithdrawal', 'availableForWithdrawalNotional']
  Volcador(acc_balances_json, "Balance", headings)
}

function GEM_Transfers(type){
  var response = GEM_PrivateRequest(Type_of_request(type), 0, 0)
  var acc_transfers_json= JSON.parse(UrlFetchApp.fetch(response.uri, response.params), function(key, value){
    if (key == 'eid')
      return Number(value)
    else
      return value
  })
  // Headings in the column order that you wish the table to appear.
  var headings = ['eid', 'status', 'currency', 'amount', 'method', 'type']
  Volcador(acc_transfers_json, "Transfers", headings)
}

function PruebaGemini(){
  GEM_Balance('notionalbalances/eur')
  GEM_PastTrades('mytrades')
  GEM_Transfers('transfers')
}