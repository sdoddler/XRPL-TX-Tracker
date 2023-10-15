/* Super Basic Script to grab Transactions from an account 
    and gather balance changes into a CSV
    Advise running against your own node as this is a slow, XRPL query-heavy script
    */

    const xrpl = require('xrpl');

    const fs = require('fs');
    const path = require('path');


    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

let xrpClient;
let explorer;

// Minimum & Maximum Ledger
// Set to -1 to go all the way back (or forward) in time
// !!! If both are set to -1 it will gather ALL transactions for an account. This could take a LONG time !!!

// or set a limit via ledger number
let minimumLedger = -1;
let maximumLedger = -1;

let queryAddress = "rAddressHere"

let node = 'wss://xrplcluster.com/'

xconnect(node).then(function () { main() })




async function main() {

    gettransactionhistory(xrpClient, queryAddress)
}


async function xconnect(node) {
    console.log('connecting to **MAINNET** - ' + node);
   
       
           xrpClient = new xrpl.Client(node)
           explorer = `https://livenet.xrpl.org/transactions/`;
   
   
       await xrpClient.connect()

       xrpClient.on('error', async () => {
        console.log('XRPL Error found!');
        await xReconnect();
    });

}


async function gettransactionhistory (client, address, ledgerMin = -1, ledgerMax = -1) {
	
    var obj = [{
        value : "Value",
        currency : "Currency",
        issuer : "Currency Issuer",
        excelTime : "Excel Time Stamp",
        UTCTime : "UTC Time",
        usdValue : "USD Value",
    }];
    //Initial account_lines request (gives us a place marker)

    const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

    var tx = await client.request({
        "command": "account_tx",
        "account": address,
        "limit": 400,
        "ledger_index_max": ledgerMax,
        "ledger_index_min": ledgerMin
    })

    var NewLines = tx.result.transactions
    var PlaceMarker = tx.result.marker

    for (c = 0; c < NewLines.length; c++) {
        
		//console.log(NewLines[c].tx);	      


            var result = {};
            result.result = NewLines[c];

			var balanceChanges = xrpl.getBalanceChanges(result.result.meta)
			//console.log(balanceChanges);
            
            
            var validTx = balanceChanges.find(x=>x.account == address)
			if (validTx){
                var txDate = new Date(xrpl.rippleTimeToUnixTime(NewLines[c].tx.date));

                for (i = 0; i < validTx.balances.length;i++){
                    var change = {
                        value : validTx.balances[i].value,
                        currency : validTx.balances[i].currency,
                        issuer : validTx.balances[i].issuer,
                        excelTime : dateToExcelSerialNumber(txDate),
                        usdValue : 0,
                    }

                    change.UTCTime = txDate.toUTCString().replace(",","");

                    console.log(`Balance Change: ${validTx.balances[i].value} ${validTx.balances[i].currency} on ${txDate.toUTCString()}`)
                    
                    
                    if (validTx.balances[i].currency == "XRP"){
                        var xrpUSDValue = await xummUSD(xrpClient,NewLines[c].tx.ledger_index);
                        //console.log(xrpUSDValue);
                        change.usdValue = parseFloat((change.value*xrpUSDValue).toFixed(6));
                    }

                    obj.push(change);
                }
			}     
        }
    
        console.log(obj)

    while (PlaceMarker != null) {
        await delay(200);

        var tx = await client.request({
            "command": "account_tx",
            "account": address,
            "limit": 400,
            "ledger_index_max": ledgerMax,
            "ledger_index_min": ledgerMin,
            "marker": PlaceMarker
        })

        var NewLines = tx.result.transactions
        var PlaceMarker = tx.result.marker

        for (c = 0; c < NewLines.length;c++) {
			var result = {};
            result.result = NewLines[c];

			var balanceChanges = xrpl.getBalanceChanges(result.result.meta)
			console.log(balanceChanges);
            
            
            var validTx = balanceChanges.find(x=>x.account == address)
			if (validTx){
                var txDate = new Date(xrpl.rippleTimeToUnixTime(NewLines[c].tx.date));

                for (i = 0; i < validTx.balances.length;i++){
                    var change = {
                        value : validTx.balances[i].value,
                        currency : validTx.balances[i].currency,
                        issuer : validTx.balances[i].issuer,
                        excelTime : dateToExcelSerialNumber(txDate),
                        usdValue : 0,
                    }

                    change.UTCTime = txDate.toUTCString().replace(",","");

                    console.log(`Balance Change: ${validTx.balances[i].value} ${validTx.balances[i].currency} on ${txDate.toUTCString()}`)
                    
                    
                    if (validTx.balances[i].currency == "XRP"){
                        var xrpUSDValue = await xummUSD(xrpClient,NewLines[c].tx.ledger_index);
                        //console.log(xrpUSDValue);
                        change.usdValue = parseFloat((change.value*xrpUSDValue).toFixed(6));
                    }

                    obj.push(change);
                }
			} 
			}

		}

       

        const csvString = [
            ...obj.map(item => [
                item.value,
                item.currency,
                item.issuer,
                item.usdValue,
                item.excelTime,
                item.UTCTime,
                
            ])
        ]
            .map(e => e.join(","))
            .join("\n");
    
            let filename = path.join(__dirname, 'balanceChanges.csv');

            fs.writeFile(filename, csvString, (err) => {
                if (err) throw err;
                console.log('balanceChanges.csv saved.');
            });
    
}

async function xummUSD(xrpClient, ledger, debug=false) {
    try {
        var result = await xrpClient.request({
            "command": "account_tx",
            "account": "rXUMMaPpZqPutoRszR29jtC8amWq3APkx",
            "ledger_index_min": ledger-15,
            "ledger_index_max": ledger+15,
            "limit":1
        })

        if (debug) console.log("XRP USD VALUE: " + result.result.transactions[0].tx.LimitAmount.value)
        return result.result.transactions[0].tx.LimitAmount.value;
    } catch (error) {
        if (debug) console.log(`ERROR RETRIEVING XRP USD VALUE`)
        return null;
    }

}

function dateToExcelSerialNumber(date) {
    const baseDate = new Date(1899, 11, 30);  // Excel's base date
    const oneDay = 24 * 60 * 60 * 1000;  // number of milliseconds in a day
    const diffDays = (date - baseDate) / oneDay;  

    return diffDays;
}
