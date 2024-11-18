import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  stringAsciiCV,
  principalCV,
  uintCV,
  Pc,
  PostConditionMode, 
  listCV
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const network = new StacksTestnet();

const secretKey = "dff46abadcbe3051f3eaa0857969117b1ab6bc65f3b6e31155d26236013633cf01";

const hopChains = ['ethereum','ethereum','ethereum','ethereum','ethereum'];
const hopAssets = ['ETH','ETH','ETH','ETH','ETH'];
const hopAddresses = ['0x742d35Cc6634C0532925a3b844Bc454e4438f44e','0x742d35Cc6634C0532925a3b844Bc454e4438f44e','0x742d35Cc6634C0532925a3b844Bc454e4438f44e','0x742d35Cc6634C0532925a3b844Bc454e4438f44e','0x742d35Cc6634C0532925a3b844Bc454e4438f44e'];
const dstChain = 'ethereum';  
const dstAsset = 'ETH';
const dstAddress = '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';
const srcAsset = 'STX';
const srcReceiver = 'ST2R1JC4FWF70GM9M7C7F4WH76PVZCSNHHP1EBKGM';
const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600);
const msgValue = 33;

const txOptions = {
  contractAddress: 'ST2R1JC4FWF70GM9M7C7F4WH76PVZCSNHHP1EBKGM',
  contractName: 'hop',
  functionName: 'commit',
  functionArgs: [
    listCV([stringAsciiCV(dstChain),stringAsciiCV(dstChain),stringAsciiCV(dstChain),stringAsciiCV(dstChain),stringAsciiCV(dstChain)]), // same data as hopChains
    listCV([stringAsciiCV(dstAsset),stringAsciiCV(dstAsset),stringAsciiCV(dstAsset),stringAsciiCV(dstAsset),stringAsciiCV(dstAsset)]),
    listCV([stringAsciiCV(dstAddress),stringAsciiCV(dstAddress),stringAsciiCV(dstAddress),stringAsciiCV(dstAddress),stringAsciiCV(dstAddress)]),
    stringAsciiCV(dstChain),
    stringAsciiCV(dstAsset),
    stringAsciiCV(dstAddress),
    stringAsciiCV(srcAsset),
    principalCV(srcReceiver),
    uintCV(timelock),
    uintCV(msgValue)
  ],
  senderKey: (secretKey),  
  validateWithAbi: true,
  network,
  anchorMode: AnchorMode.Any,
  postConditions: [
    Pc.principal('ST2D4483A7FHNKV1ANCBWQ4TEDH31ZY1R8AG6WFCA').willSendLte(100000000).ustx(),
  ],
  postConditionMode: PostConditionMode.Allow,
};

const transaction = await makeContractCall(txOptions);
const broadcastResponse = await broadcastTransaction(transaction, network);
const txId = broadcastResponse.txid;
console.log(`https://explorer.hiro.so/txid/0x${txId}?chain=testnet`);
