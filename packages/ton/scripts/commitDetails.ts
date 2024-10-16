import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 1000001n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("EQABxU-5XJQxIVdsrsp67bJ0_72uzcShudE-hPedTh0zNo1H"),
        "getCommitDetails",
        stack
    );
    const commitDetails = details.stack[0][1].elements;
    if(commitDetails[0] === undefined){
        console.log("Commit Details:",commitDetails);
        return;
    }

    console.log("Commit Details:");
    console.log("dstAddress: ", commitDetails[0].slice.bytes);
    console.log("dstChain: ", commitDetails[1].slice.bytes);
    console.log("dstAsset: ", commitDetails[2].slice.bytes);
    console.log("srcAsset: ", commitDetails[3].slice.bytes);
    console.log("sender: ", commitDetails[4].slice.bytes);
    console.log("sender public key: ",commitDetails[5].number.number)
    console.log("srcReceiver: ", commitDetails[6].slice.bytes);
    console.log("timelock: ", commitDetails[7].number.number);
    console.log("amount: ", commitDetails[8].number.number);
    console.log("messenger: ", commitDetails[9].slice.bytes);
    console.log("locked: ", commitDetails[10].number.number );
    console.log("uncommitted: ", commitDetails[11].number.number );

}

run().catch(console.error);


