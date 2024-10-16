import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 28980991593716787793729160457641158411340079193941161001671239997837163559946n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"),
        "getLockIdByCommitId",
        stack
    );

    if(details.stack[0][0] === 'num'){
        console.log("lockId: ",details.stack[0][1]);
        return;
    }
    console.log("there isnt lockId for that commitId");
    return;
}

run().catch(console.error);


