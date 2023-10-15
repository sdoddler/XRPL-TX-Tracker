# XRPL-TX-Tracker
A super basic TX Tracker, exporting balance changes to a CSV - USD tracking for $XRP.

## Dependencies
Only requires the xrpl library for Node js ```npm install xrpl```


### How to use
Modify the below values - Please consider using from your own node as this is a query-heavy script.

queryAddress: the address you want to query transactions against..

Ledgers:
Set maximumLedger to -1 to go all the way back in time through transactions
  or minimumLedger to -1 to go forward in time
!!! If both are set to -1 it will gather ALL transactions for an account. This could take a LONG time !!!
Or set a limit via ledger number

```
let minimumLedger = -1;
let maximumLedger = -1;

let queryAddress = "rAddressHere"

let node = 'wss://xrplcluster.com/'
```
