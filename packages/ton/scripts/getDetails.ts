import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient } from "ton";
import { Address } from '../node_modules/ton/dist/address/Address';

async function run(){
    const endpoint = await getHttpEndpoint({
        network: "testnet",
    }); 

    const client = new TonClient({ endpoint });

    const bigIntValue = 10116354356264177275392909770955841371410553720652860342604159354844513345829n;
    const bigIntString = bigIntValue.toString();

    const stack = [
        ["num", bigIntString]
    ];

    const details = await client.callGetMethod(
        Address.parse("EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG"),
        "getHTLCDetails",
        stack
    );
    const htlcDetails =  details.stack[0][1].elements;

    if(htlcDetails[0] === undefined){
        console.log("HTLC Details:",htlcDetails);
        return;
    }

    console.log("HTLC Details:");
    console.log("Hashlock: ", htlcDetails[0].number.number);
    console.log("Secret: ", htlcDetails[1].number.number);
    console.log("Amount: ", htlcDetails[2].number.number);
    console.log("Timelock: ", htlcDetails[3].number.number);
    console.log("Sender: ", htlcDetails[4].slice.bytes);
    console.log("Receiver: ", htlcDetails[5].slice.bytes);
    console.log("Redeemed: ", htlcDetails[6].number.number,);
    console.log("Refunded: ", htlcDetails[7].number.number);
}

run().catch(console.error);



