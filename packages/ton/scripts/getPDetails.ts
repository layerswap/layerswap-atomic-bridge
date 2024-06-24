import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function getPHTLCDetails(phtlcID: bigint){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntString = phtlcID.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG"),
        "getPHTLCDetails",
        stack
    );
    const phtlcDetails = details.stack[0][1].elements;

    if(phtlcDetails[0] === undefined){
        console.log("PHTLC Details:",phtlcDetails);
        return;
    }

    console.log("PHTLC Details:");
    console.log("dstAddress: ", phtlcDetails[0].slice.bytes);
    console.log("srcAssetId: ", phtlcDetails[1].number.number);
    console.log("sender: ", phtlcDetails[2].slice.bytes);
    console.log("srcAddress: ", phtlcDetails[3].slice.bytes);
    console.log("timelock: ", phtlcDetails[4].number.number);
    console.log("messenger: ", phtlcDetails[5].slice.bytes);
    console.log("amount: ", phtlcDetails[6].number.number,);
    console.log("refunded: ", phtlcDetails[7].number.number);
    console.log("converted: ", phtlcDetails[8].number.number);
    console.log("phtlcID: ", phtlcDetails[9].number.number);

}

getPHTLCDetails(7n)

