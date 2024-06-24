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
        Address.parse("EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG"),
        "contractLength",
        stack
    );

    const pDetails = await client.callGetMethod(
        Address.parse("EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG"),
        "pContractLength",
        stack
    );

    console.log("HTLC contracts list length : ",details.stack[0][1]);
    console.log("PHTLC contracts list length : ",pDetails.stack[0][1]);
}

run().catch(console.error);



