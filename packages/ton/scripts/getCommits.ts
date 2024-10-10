import { getHttpEndpoint } from "@orbs-network/ton-access";
import { TonClient, Address, beginCell } from "ton";

async function run() {
    try {
        // Get the endpoint for the TON testnet
        const endpoint = await getHttpEndpoint({
            network: "testnet",
        });
    const client = new TonClient({ 
        endpoint, 
        timeout: 60000 // 60 seconds timeout 
    });
        // Initialize the TON client with the endpoint

        // Parse the address that will be passed to the method
        const addr = Address.parse("0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y");

        // Create a cell containing the address, to be used as part of the stack
        const stack = [
            ["tvm.Slice", beginCell().storeAddress(addr).endCell().toBoc()]
        ];

        // Call the smart contract's method using the prepared stack
        const details = await client.callGetMethod(
            Address.parse("kQBWklVCtZZgJjBIijpFB3SiQ3RgJEe76Nsjy0ketvxniQbfF"),
            "getCommits",
            stack
        );

        // Extract and handle the results
        if (details.stack && details.stack[0] && details.stack[0][1] && details.stack[0][1].elements) {
            const commitDetails = details.stack[0][1].elements;
            if (commitDetails.length === 0) {
                console.log("No commits found.");
            } else {
                console.log("Commit Details:", commitDetails);
            }
        } else {
            console.log("Unexpected response structure:", details);
        }
    } catch (err) {
        // Explicitly assert the type of 'err' as 'any' to access its properties
        const error = err as any;
        console.error("An error occurred while calling the smart contract method:", error.message);

        // Handle specific errors, such as timeouts or network issues
        if (error.response && error.response.status === 504) {
            console.error("Request timed out. Please try again later.");
        }
    }
}

run().catch(console.error);
