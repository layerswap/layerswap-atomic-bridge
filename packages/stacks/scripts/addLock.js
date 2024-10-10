import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  uintCV,
  PostConditionMode,
  bufferCV
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

async function main() {
  const network = new StacksTestnet();
  const secretKey = "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601";
  
  const id = BigInt("41284802421415824");
  const hashlock = Buffer.from("88470a9f59f469bf204c9ea2bfc95ff9d7d54adf37cd56fc011e05f857f01c8d","hex");
  const timelock = BigInt(Math.floor(Date.now() / 1000) - 3600);
  
  const txOptions = {
    contractAddress: 'ST136VTJP5KQ24EDMKWP0PJ44VVHMGX4KNKAW3XW5',
    contractName: 'jiza',
    functionName: 'add-lock',
    functionArgs: [
      uintCV(id),
      bufferCV(hashlock),
      uintCV(timelock)
    ],
    senderKey: secretKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
  };

  try {
    const transaction = await makeContractCall(txOptions);
    const broadcastResponse = await broadcastTransaction(transaction, network);
    const txId = broadcastResponse.txid;
    console.log(`https://explorer.hiro.so/txid/0x${txId}?chain=testnet`);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().catch(console.error);