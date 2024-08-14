import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';
import { Cell } from "@ton/core/dist/boc/Cell";

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 86063709575516430416322238016776016577783477821483564045133774829893108097467n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("kQDUdA1NLqaognvWvgk--471bY09NIc2qf7qYxmpi-CgrJcD"),
        "getLockCDetails",
        stack
    );
    const lockDetails =  details.stack[0][1].elements;
    if(lockDetails[0] === undefined){
        console.log("Lock Details:",lockDetails);
        return;
    }

    console.log("Lock Details:");
    console.log("dstAddress: ", (Cell.fromBase64(lockDetails[0].slice.bytes)).asSlice().loadStringTail());
    console.log("dstChain: ", (Cell.fromBase64(lockDetails[1].slice.bytes)).asSlice().loadStringTail());
    console.log("dstAsset: ",  (Cell.fromBase64(lockDetails[2].slice.bytes)).asSlice().loadStringTail());
    console.log("srcAsset: ",  (Cell.fromBase64(lockDetails[3].slice.bytes)).asSlice().loadStringTail());
    console.log("sender: ",  (Cell.fromBase64(lockDetails[4].slice.bytes)).asSlice().loadAddress());
    console.log("srcReceiver: ", (Cell.fromBase64(lockDetails[5].slice.bytes)).asSlice().loadAddress());
    console.log("hashlock: ", lockDetails[6].number.number);
    console.log("secret: ", lockDetails[7].number.number);
    console.log("amount: ", lockDetails[8].number.number);
    console.log("timelock: ", lockDetails[9].number.number );
    console.log("Redeemed: ", lockDetails[10].number.number);
    console.log("Unlocked: ", lockDetails[11].number.number);
    console.log("jettonMasterAddress: ", (Cell.fromBase64(lockDetails[12].slice.bytes)).asSlice().loadAddress());
    console.log("htlcJettonWalletAddress: ", (Cell.fromBase64(lockDetails[13].slice.bytes)).asSlice().loadAddress()); 
}

run().catch(console.error);



