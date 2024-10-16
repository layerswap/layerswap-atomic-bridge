import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 66281763433596058795635477366290197584828204308153459951051320666201413942154n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("kQABxU-5XJQxIVdsrsp67bJ0_72uzcShudE-hPedTh0zNjbN"),
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



