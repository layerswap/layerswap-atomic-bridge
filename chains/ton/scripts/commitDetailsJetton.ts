import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';
import { Cell } from "@ton/core/dist/boc/Cell";

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 24716356531191335585328661435771043996539443399925688399959468269084770915966n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("kQDUdA1NLqaognvWvgk--471bY09NIc2qf7qYxmpi-CgrJcD"),
        "getCommitDetails",
        stack
    );
    const commitDetails = details.stack[0][1].elements;
    if(commitDetails[0] === undefined){
        console.log("Commit Details:",commitDetails);
        return;
    }

    console.log("Commit Details:");
    console.log("dstAddress: ", (Cell.fromBase64(commitDetails[0].slice.bytes)).asSlice().loadStringTail());
    console.log("dstChain: ", (Cell.fromBase64(commitDetails[1].slice.bytes)).asSlice().loadStringTail());
    console.log("dstAsset: ",  (Cell.fromBase64(commitDetails[2].slice.bytes)).asSlice().loadStringTail());
    console.log("srcAsset: ",  (Cell.fromBase64(commitDetails[3].slice.bytes)).asSlice().loadStringTail());
    console.log("sender: ",  (Cell.fromBase64(commitDetails[4].slice.bytes)).asSlice().loadAddress());
    console.log("srcReceiver: ", (Cell.fromBase64(commitDetails[5].slice.bytes)).asSlice().loadAddress());
    console.log("timelock: ", commitDetails[6].number.number);
    console.log("amount: ", commitDetails[7].number.number);
    console.log("messenger: ", (Cell.fromBase64(commitDetails[8].slice.bytes)).asSlice().loadAddress());
    console.log("locked: ", commitDetails[9].number.number );
    console.log("uncommitted: ", commitDetails[10].number.number );
    console.log("jettonMasterAddress: ", (Cell.fromBase64(commitDetails[11].slice.bytes)).asSlice().loadAddress());
    console.log("htlcJettonWalletAddress: ", (Cell.fromBase64(commitDetails[12].slice.bytes)).asSlice().loadAddress());    
}

run().catch(console.error);


