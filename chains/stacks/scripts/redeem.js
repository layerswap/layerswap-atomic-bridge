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
  
  const id = BigInt("41305506774033082");
  const secret = Buffer.from("746f6e0000000000000000000000000000000000000000000000000000000000","hex");
  
  const txOptions = {
    contractAddress: 'ST2R1JC4FWF70GM9M7C7F4WH76PVZCSNHHP1EBKGM',
    contractName: 'redeemTest',
    functionName: 'redeem',
    functionArgs: [
      uintCV(id),
      bufferCV(secret)
    ],
    senderKey: secretKey,
    validateWithAbi: true,
    network,
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Allow,
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