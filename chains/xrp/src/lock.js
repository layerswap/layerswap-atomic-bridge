'use strict'
require('dotenv').config();
const fs = require('fs');
const xrpl = require('xrpl');
const cc = require('five-bells-condition');
const crypto = require('crypto');

const seed = process.env.SEED;
const seed2 = process.env.SEED2;

async function main() {
  try {
    const preimageData = crypto.randomBytes(32);
    const myFulfillment = new cc.PreimageSha256();
    myFulfillment.setPreimage(preimageData);
    const conditionHex = myFulfillment.getConditionBinary().toString('hex').toUpperCase();

    const client = new xrpl.Client(process.env.CLIENT);
    await client.connect();

    const wallet = await xrpl.Wallet.fromSeed(seed);
    const wallet2 = await xrpl.Wallet.fromSeed(seed2);
    console.log("Wallet Address: ", wallet.address);
    console.log("Wallet balance before tx: ",await client.getXrpBalance(wallet.address));

    let cancelAfter = new Date((new Date().getTime() / 1000) + 10); // 15 minutes from now
    cancelAfter = new Date(cancelAfter * 1000);
    console.log("This escrow will finish after: ", cancelAfter);

    const escrowCreateTransaction = {
      "TransactionType": "EscrowCreate",
      "Account": wallet.address,
      "Destination": wallet2.address,
      "Amount": "100000", 
      "Condition": conditionHex,
      "CancelAfter": xrpl.isoTimeToRippleTime(cancelAfter.toISOString()),
  };

    xrpl.validate(escrowCreateTransaction);

    console.log('Signing and submitting the transaction:',
                JSON.stringify(escrowCreateTransaction, null,  "\t"), "\n"
    );
    const response  = await client.submitAndWait(escrowCreateTransaction, { wallet });

    fs.writeFileSync('.env', fs.readFileSync('.env', 'utf8').replace(new RegExp(`^${`SEQUENCE`}=.*`, 'm'), `${`SEQUENCE`}=${response.result.tx_json.Sequence}`));
    fs.writeFileSync('.env', fs.readFileSync('.env', 'utf8').replace(new RegExp(`^${`CONDITION`}=.*`, 'm'), `${`CONDITION`}=${conditionHex}`));
    fs.writeFileSync('.env', fs.readFileSync('.env', 'utf8').replace(new RegExp(`^${`FULFILLMENT`}=.*`, 'm'), `${`FULFILLMENT`}=${myFulfillment.serializeBinary().toString('hex').toUpperCase()}`));
    
    console.log(`Sequence number: ${response.result.tx_json.Sequence}`);
    console.log(`Finished submitting! ${JSON.stringify(response.result, null, "\t")}`);
    console.log(`TX result: `,response.result.meta.TransactionResult);
    console.log("Wallet balance after tx: ",await client.getXrpBalance(wallet.address));

    await client.disconnect();

  } catch (error) {
    console.log(error);
  }
}

main()