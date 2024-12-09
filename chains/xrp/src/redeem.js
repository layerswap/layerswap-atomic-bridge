'use strict'
require('dotenv').config();
const  xrpl = require('xrpl')

const seed = process.env.SEED;
const offerSequence = process.env.SEQUENCE;
const condition = process.env.CONDITION;
const fulfillment = process.env.FULFILLMENT;

const main = async () => {
  try {
    const client = new xrpl.Client(process.env.CLIENT);
    await client.connect();

    const wallet = await xrpl.Wallet.fromSeed(seed);
    console.log("Wallet Address: ", wallet.address);

    if((!offerSequence)|| (condition === "" || fulfillment === "")){
        throw new Error("Please specify the sequence number, condition and fulfillment of the escrow you created");
    };

    const escrowFinishTransaction = {
        "Account": wallet.address,
        "TransactionType": "EscrowFinish",
        "Owner": wallet.address,
        "OfferSequence": offerSequence,
        "Condition": condition,
        "Fulfillment": fulfillment,
    };

    xrpl.validate(escrowFinishTransaction);

    console.log('Signing and submitting the transaction:', JSON.stringify(escrowFinishTransaction, null,  "\t"));
    const response  = await client.submitAndWait(escrowFinishTransaction, { wallet });
    console.log(`Finished submitting! ${JSON.stringify(response.result, null,  "\t")}`);
    console.log(`TX result: `,response.result.meta.TransactionResult);

    await client.disconnect();

  } catch (error) {
    console.log(error);
  }
}

main()