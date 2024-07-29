import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 94398540635666791437011316534845680898932674074475095438877086381920743827185n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"),
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
    console.log("srcReceiver: ", commitDetails[5].slice.bytes);
    console.log("timelock: ", commitDetails[6].number.number);
    console.log("amount: ", commitDetails[7].number.number);
    console.log("messenger: ", commitDetails[8].slice.bytes);
    console.log("locked: ", commitDetails[9].number.number );
    console.log("uncommitted: ", commitDetails[10].number.number );

}

run().catch(console.error);


