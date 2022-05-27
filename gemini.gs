/**
 * 25/05/2022
 * @favieres99
 * By introducing your api-key and your secret in Type_of_request, setting the name of the spreadsheet you want to write the info in each of the function calls of the PruebaGemini function, it will fetch all your data from de Gemini API
 */

/**
 * GEM_PrivateRequest it computes de url with the paramaters needed
 * @paramm gemrequest is an abject with the data needed to compute de url call
 * @param limit_trades is used when you want to fecth your past trades, by default is 50 but is now setted to 500
 * @param time_stamp is the moment in time from which the data is requested
 * @return object with the url and the params
 */
function GEM_PrivateRequest(gemrequest, limit_trades, time_stamp) {
  function HMACSHA384HEX(s, secret) { return ToHex(Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_384, s, secret)).toString(); }
  function ToHex(s) { return s.map(function(byte) { return ('0' + (byte & 0xFF).toString(16)).slice(-2);}).join('');  }
  function stringToBase64(s) { return (Utilities.base64Encode(s)); }
  
  if (limit_trades)
    gemrequest.payload = {"request": gemrequest.version + gemrequest.command + gemrequest.payload, "nonce": new Date().getTime(), "limit_trades" : limit_trades, "timestamp" : time_stamp};
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

/**
 * Type_of_request it fill the data of the request
 * @param endpoint is the endpoint asked to the API
 * @return object with the basic data for the request
 */
function Type_of_request(endpoint){
  var gemrequest = {
  'apikey'   : 'account-o4SsTgmotFbGcwo201h6',
  'secret'   : 'TcfT4GNwY7JKHjaA3Cba6V6hAgH',
  'uri'      : 'https://api.gemini.com',
  'version'  : '/v1/',
  'command'  : endpoint,
  'method'   : 'post',
  'payload'  : ''
  };
  return gemrequest
}

/**
 * Volcador it reads the json and loops through it as it fills the output array, it then chooses the spreadsheet to set the information in it
 * @param acc_json the json recieved from de API
 * @param nameOfSheet the name of the spreadsheet to write on
 * @param headings the head of each column to extract the data from de json and print the headline
 * @return
 */
function Volcador(acc_json, nameOfSheet, headings){
  var outputRows = []
  // Loop through each member
  acc_json.forEach(function(member) { outputRows.push(headings.map(function(heading) { return member[heading] || '' } )) })
  // // Chooses the sheet to write on, clears it, write de heading and the data
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nameOfSheet)
  sheet.clear()
  if (outputRows.length) {
    // Add the headings - delete this next line if headings not required
    outputRows.unshift(headings)
    sheet.getRange(1, 1, outputRows.length, outputRows[0].length).setValues(outputRows)
  }
}

/**
 * Set_time gets todays date and substracts de amount of time you asked for
 * @param weeks how many weeks back are being asked for
 * @param days how many days back are being asked for
 * @param hours how many hours back are being asked for
 * @return 1 in case you didn't ask for any time or the time you have asked for
 */
function Set_time(weeks, days, hours){
  var date = new Date
  var today = Math.floor((date.getTime()/1000)).toString()
  var time = today - weeks * 604800 - days * 86400 - hours * 3600
  return today == time ? 1 : time
}

/**
 * GEM_PastTrades it loops through the jsons recieved to fetch the data of past trades
 * @param endpoint the endpoint we are looking for
 * @param nameOfSheet the name of the sheet to write on
 * @return
 */
function GEM_PastTrades(endpoint, nameOfSheet){
  var limit_trades = 500 // Amount of trades asked to the request
  // Set values to 0 to get all data
  var weeks = 0
  var days = 0
  var hours = 0
  var time_stamp = Set_time(weeks, days, hours)
  // Headings in the column order that you wish the table to appear.
  var headings = ['price', 'amount', 'timestamp', 'timestampms', 'type', 'aggressor', 'fee_currency', 'fee_amount', 'tid', 'order_id', 'exchange', 'is_auction_fill', 'is_clearing_fill', 'symbol']
  var outputRows = []
  // Loops through every json request needed
  while (1){
    var response = GEM_PrivateRequest(Type_of_request(endpoint), limit_trades, time_stamp)
    var acc_pastrades_json= JSON.parse(UrlFetchApp.fetch(response.uri, response.params), function (key,value){
      if (key == 'is_clearing_fill' || key == 'is_auction_fill' || key == 'aggressor') { if(value) {return 'true'} else {return 'false'}}
      else if (key == 'price' || key == 'tid' || key == 'amount' || key == 'timestampms' || key == 'timestamps' || ( key == 'fee_amount' && value != 0)) {return Number(value)}
      else { return value }
    })
    // Loop through each member
    acc_pastrades_json.forEach(function(member) { outputRows.push(headings.map(function(heading) { return member[heading] || '' } )) })
    // The if check the json has something on it
    if (acc_pastrades_json.length){
      var highest_time = acc_pastrades_json[0].timestamp
      time_stamp = highest_time + 1
    }
    else
      break
  }
  // Chooses the sheet to write on, clears it, write de heading and the data
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nameOfSheet)
  sheet.clear()
  outputRows.unshift(headings)
  sheet.getRange(1, 1, outputRows.length, outputRows[0].length).setValues(outputRows)
}

/**
 * GEM_Balance it fetches the balance data from de API
 * @param endpoint sets endpoint we are looking for
 * @param nameOfSheet the name of the sheet to write on
 * @return
 */
function GEM_Balance(endpoint, nameOfSheet) {
  var response = GEM_PrivateRequest(Type_of_request(endpoint), 0, 0)
  var acc_balances_json= JSON.parse(UrlFetchApp.fetch(response.uri, response.params), function(key, value){
    if (key == 'amount' || key == 'amountNotional') {return Number(value)}
    else if ((key == 'availableForWithdrawal' || key == 'availableForWithdrawalNotional') && value != 0) {return Number(value)}
    else {return value}
  })
  // Headings in the column order that you wish the table to appear.
  var headings = ['currency', 'amount', 'amountNotional', 'availableForWithdrawal', 'availableForWithdrawalNotional']
  Volcador(acc_balances_json, nameOfSheet, headings)
}

/**
 * GEM_Transfer it fetches the transefers data from de API
 * @param endpoint sets the endpoint we are looking for
 * @param nameOfSheet the name of the sheet to write on
 * @return
 */
function GEM_Transfers(endpoint, nameOfSheet){
  var response = GEM_PrivateRequest(Type_of_request(endpoint), 0, 0)
  var acc_transfers_json= JSON.parse(UrlFetchApp.fetch(response.uri, response.params), function(key, value){
    if (key == 'eid')
      return Number(value)
    else
      return value
  })
  // Headings in the column order that you wish the table to appear.
  var headings = ['eid', 'status', 'currency', 'amount', 'method', 'type']
  Volcador(acc_transfers_json, nameOfSheet, headings)
}

/**
 * PruebaGemini it calls the functions that fecthes the data
 * @first_param is the endpoint we are looking for
 * @second_param is the sheet we are writing to
 */
function PruebaGemini(){
  GEM_Balance('notionalbalances/eur', "Balance")
  GEM_PastTrades('mytrades', "PastTrades")
  GEM_Transfers('transfers', "Transfers")
}