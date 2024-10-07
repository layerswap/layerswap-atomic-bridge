import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  stringAsciiCV,
  principalCV,
  uintCV,
  Pc,
  PostConditionMode, 
  bufferCV
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const network = new StacksTestnet();

const secretKey = "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601";

const id = "6464";
const hashlock = Buffer.from("88470a9f59f469bf204c9ea2bfc95ff9d7d54adf37cd56fc011e05f857f01c8d","hex");
const timelock = BigInt(Math.floor(Date.now() / 1000) + 100);
const srcReceiver = 'ST2D4483A7FHNKV1ANCBWQ4TEDH31ZY1R8AG6WFCA';
const srcAsset = 'STX';
const dstChain = 'ethereum';  
const dstAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const dstAsset = 'ETH';
const msgValue = 36;

const txOptions = {
  contractAddress: 'ST136VTJP5KQ24EDMKWP0PJ44VVHMGX4KNKAW3XW5',
  contractName: 'amigo',
  functionName: 'lock',
  functionArgs: [
    uintCV(id),
    bufferCV(hashlock),
    uintCV(timelock),
    principalCV(srcReceiver),
    stringAsciiCV(srcAsset),
    stringAsciiCV(dstChain),
    stringAsciiCV(dstAddress),
    stringAsciiCV(dstAsset),
    uintCV(msgValue)
  ],
  senderKey: (secretKey),  
  validateWithAbi: true,
  network,
  anchorMode: AnchorMode.Any,
  postConditions: [
    Pc.principal('ST136VTJP5KQ24EDMKWP0PJ44VVHMGX4KNKAW3XW5').willSendLte(100000000).ustx(),
  ],
  postConditionMode: PostConditionMode.Allow,
};

const transaction = await makeContractCall(txOptions);
const broadcastResponse = await broadcastTransaction(transaction, network);
const txId = broadcastResponse.txid;
console.log(`https://explorer.hiro.so/txid/0x${txId}?chain=testnet`);
