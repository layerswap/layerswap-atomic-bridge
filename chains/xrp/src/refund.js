'use strict'
require('dotenv').config();
const xrpl = require('xrpl');

const seed = process.env.SEED; 
const sequenceNumber = process.env.SEQUENCE;

async function main() {
  try {
    const client = new xrpl.Client(process.env.CLIENT);
    await client.connect();

    const wallet = await xrpl.Wallet.fromSeed(seed);
    console.log("Wallet Address: ", wallet.address);

    if(!sequenceNumber){
        throw new Error("Please specify the sequence number of the escrow you created");
    };

    const escrowCancelTransaction = {
      "Account": wallet.address,
      "TransactionType": "EscrowCancel",
      "Owner": wallet.address,
      "OfferSequence": sequenceNumber, 
    };

    xrpl.validate(escrowCancelTransaction);

    console.log('Signing and submitting the transaction: ', JSON.stringify(escrowCancelTransaction, null,  "\t"));
    const response  = await client.submitAndWait(escrowCancelTransaction, { wallet });
    console.log(`Finished submitting! \n${JSON.stringify(response.result, null, "\t")}`);
    console.log(`TX result: `,response.result.meta.TransactionResult);

    await client.disconnect();

  } catch (error) {
    console.log(error);
  }
}

main()