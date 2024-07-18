import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const stack: any[] | undefined = [];

    const details = await client.callGetMethod(
        Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"),
        "locksLength",
        stack
    );

    const commitDetails = await client.callGetMethod(
        Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"),
        "commitsLength",
        stack
    );

    const commitIdLockIdLength = await client.callGetMethod(
        Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"),
        "lockIdToCommitIdLength",
        stack
    );
    console.log("Locks list length : ",details.stack[0][1]);
    console.log("Commits list length : ",commitDetails.stack[0][1]);
    console.log("Commits list length : ",commitIdLockIdLength.stack[0][1]);
}

run().catch(console.error);



