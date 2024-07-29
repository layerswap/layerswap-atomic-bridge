import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 7621991010947344452180899744448993864955665500331425174040819581377600501749n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"),
        "getLockCDetails",
        stack
    );
    const lockDetails =  details.stack[0][1].elements;
    if(lockDetails[0] === undefined){
        console.log("Lock Details:",lockDetails);
        return;
    }

    console.log("Lock Details:");
    console.log("Destination Address: ", (lockDetails[0].slice.bytes));
    console.log("Destination Chain: ", (lockDetails[1].slice.bytes));
    console.log("Destination Asset: ", (lockDetails[2].slice.bytes));
    console.log("Source Asset: ", (lockDetails[3].slice.bytes));
    console.log("Sender: ", (lockDetails[4].slice.bytes));
    console.log("Source Receiver: ", (lockDetails[5].slice.bytes));
    console.log("Hashlock: ", lockDetails[6].number.number);
    console.log("Secret: ", lockDetails[7].number.number);
    console.log("Amount: ", lockDetails[8].number.number);
    console.log("Timelock: ", lockDetails[9].number.number);
    console.log("Redeemed: ", lockDetails[10].number.number);
    console.log("Unlocked: ", lockDetails[11].number.number);
}

run().catch(console.error);



