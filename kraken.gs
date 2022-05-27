/**
 * 25/05/2022
 * @favieres99
 * By setting api-key and your secret in the global variable, setting the name of the api-key and the name of the spreadsheet you want to write the info in the Prueba_Krahen functiion, it will fetch all your data from de Kraken API
 */

API_Public_Key = {}
API_Private_Key = {}

/**
 * KAPI_Private computes the call to the API
 * @param acc_id api_key
 * @param endpoint the endpoint asked to the API
 * @param parameteres the parameters sked to the API
 * @param cooldown counter so there are not too many calls to the API
 * @return the json from de API
 */
function KAPI_Private(acc_id, endpoint, parameters, cooldown) {
  if (cooldown != 0 && cooldown % 7 == 0){
    Utilities.sleep(42000)
  }
  var api_key = API_Public_Key[acc_id]
  var api_secret = Utilities.base64Decode(API_Private_Key[acc_id])
  var api_path = Utilities.newBlob('/0/private/' + endpoint).getBytes()
  var api_nonce = Number(new Date().getTime()).toFixed(0)*1000;
  var api_post = 'nonce=' + api_nonce + '&' + parameters
  
  var api_sha256 = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, api_nonce + api_post)
  var api_hmac = Utilities.computeHmacSignature(Utilities.MacAlgorithm.HMAC_SHA_512, api_path.concat(api_sha256), api_secret)
  var api_signature = Utilities.base64Encode(api_hmac)
  
  var http_options = {'method':'POST', 'payload':api_post, 'headers':{'API-Key':api_key, 'API-Sign':api_signature}}
  var http_response = UrlFetchApp.fetch('https://api.kraken.com/0/private/' + endpoint, http_options)
  var api_data = http_response.getContentText()
  console.log(api_data);
  return http_response
}

/**
 * KAPI_Balance writes the balance in the sheet
 * @param acc_id api-key
 * @param nameOfSheet sheet to write to
 * @return
 */
function KAPI_Balance(acc_id, nameOfSheet) {
  var acc_balances_json = JSON.parse(KAPI_Private(acc_id, 'Balance', '', 0))
  var acc_balances = new Array
  for ( name in acc_balances_json['result'] ) {
    acc_balances.push([name, parseFloat(acc_balances_json['result'][name])])
  }
  var primera_fila = ["COIN", "BALANCE"]
  acc_balances.unshift(primera_fila)

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nameOfSheet);
  sheet.clear(); 
  sheet.getRange(1,1,acc_balances.length,primera_fila.length).setValues(acc_balances);
}

/**
 * KAPI_Ledgers writes the balance in the sheet
 * @param acc_id api_key
 * @param nameOfSheet sheet to write to
 * @return
 */
function KAPI_Ledgers(acc_id, nameOfSheet) {
  //Para que empiece a enseñar desde cuando queramos
  var all = 1
  var weeks = 0
  var days = 0
  var hours = 0
  var fecha_inicio = Set_time(all, weeks, days, hours)

  //El array en el que vamos a escribir
  var acc_ledgers = new Array
  var cooldown = 0

  //Para titular las columnas
  var primera_fila = ["ID", "ACLASS", "AMOUNT", "ASSET", "BALANCE", "FEE", "REFID", "TIME", "TYPE", "SUBTYPE"]
  acc_ledgers.push(primera_fila)

  //Para sacar la cantidad de filas que hay que escribir
  var params = 'start=' + fecha_inicio
  var acc_ledgers_json = JSON.parse(KAPI_Private(acc_id, 'Ledgers', params, cooldown))
  var count = acc_ledgers_json['result']['count']

  //El loop que rellena el array
  var off = 0
  while (off < count)
  {
    params = 'ofs=' + off + '&start=' + fecha_inicio
    cooldown++
    var acc_ledgers_json = JSON.parse(KAPI_Private(acc_id, 'Ledgers', params, cooldown))
    for (var name in acc_ledgers_json['result']['ledger']) {
      acc_ledgers.push([name, acc_ledgers_json['result']['ledger'][name]['aclass'], parseFloat(acc_ledgers_json['result']['ledger'][name]['amount']), acc_ledgers_json['result']['ledger'][name]['asset'], parseFloat(acc_ledgers_json['result']['ledger'][name]['balance']), parseFloat        (acc_ledgers_json['result']['ledger'][name]['fee']), acc_ledgers_json['result']['ledger'][name]['refid'], parseFloat(acc_ledgers_json['result']['ledger'][name]['time']), acc_ledgers_json['result']['ledger'][name]['type'], acc_ledgers_json['result']['ledger'][name]['subtype']])
    }    
    off = off + 50
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nameOfSheet);
  sheet.clear(); 
  sheet.getRange(1,1,acc_ledgers.length,primera_fila.length).setValues(acc_ledgers);
}

/**
 * Set_time gets todays date and substracts de amount of time you asked for
 * @param all boolean to get all data
 * @param weeks how many weeks back are being asked for
 * @param days how many days back are being asked for
 * @param hours how many hours back are being asked for
 * @return how back to the past you need to ask for
 */
function Set_time(all, weeks, days, hours){
  if (all)
    return 0
  var today = Math.floor((new Date.getTime()/1000)).toString()
  return today - weeks * 604800 - days * 86400 - hours * 3600
}

/**
 * KAPI_TradesHistory writes de trade history in the sheet
 * @param acc_id api-key
 * @param nameOfSheet sheet to write to
 * @return
 */
function KAPI_TradesHistory(acc_id, nameOfSheet) {
  //Para que empiece a enseñar desde cuando queramos
  var all = 1
  var weeks = 0
  var days = 0
  var hours = 0
  var fecha_inicio = Set_time(all, weeks, days, hours)

  //El array en el que vamos a escribir
  var acc_tradeshistory = new Array
  var cooldown = 0

  //Para titular las columnas
  var primera_fila = ["ID", "ORDERTXID", "POSTXID", "PAIR", "TIME", "TYPE", "ORDERTYPE", "PRICE", "COST", "FEE", "VOL", "MARGIN", "MISC"]
  acc_tradeshistory.push(primera_fila)

  //Para sacar la cantidad de filas que hay que escribir
  params = 'start=' + fecha_inicio
  var acc_tradeshistory_json = JSON.parse(KAPI_Private(acc_id, 'TradesHistory', params, cooldown))
  var count = acc_tradeshistory_json['result']['count']

  //El loop que rellena el array, estan parseados a float para que el valor sea correcto
  var off = 0
  while (off < count)
  {
    params = 'ofs=' + off + '&start=' + fecha_inicio
    cooldown++
    var acc_tradeshistory_json = JSON.parse(KAPI_Private(acc_id, 'TradesHistory', params, cooldown))
    for (var name in acc_tradeshistory_json['result']['trades']){
      acc_tradeshistory.push([name, acc_tradeshistory_json['result']['trades'][name]['ordertxid'], acc_tradeshistory_json['result']['trades'][name]['postxid'], acc_tradeshistory_json['result']['trades'][name]['pair'], acc_tradeshistory_json['result']['trades'][name]['time'], acc_tradeshistory_json['result']['trades'][name]['type'], acc_tradeshistory_json['result']['trades'][name]['ordertype'], parseFloat(acc_tradeshistory_json['result']['trades'][name]['price']), parseFloat(acc_tradeshistory_json['result']['trades'][name]['cost']), parseFloat(acc_tradeshistory_json['result']['trades'][name]['fee']), parseFloat(acc_tradeshistory_json['result']['trades'][name]['vol']), parseFloat(acc_tradeshistory_json['result']['trades'][name]['margin']), acc_tradeshistory_json['result']['trades'][name]['misc']])
    }
    off = off + 50
  }

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nameOfSheet);
  sheet.clear(); 
  sheet.getRange(1,1,acc_tradeshistory.length,primera_fila.length).setValues(acc_tradeshistory);
}

/**
 * PruebaKraken calls all functions to write
 * @first_param api-keu
 * @second_param sheet to write to
 * @return
 */
function PruebaKraken(){
  KAPI_Balance('', "Balance");
  KAPI_TradesHistory('', "TradesHistory");
  KAPI_Ledgers('', "Ledgers");
}