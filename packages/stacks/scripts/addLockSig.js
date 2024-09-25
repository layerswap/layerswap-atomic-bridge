import {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  uintCV,
  PostConditionMode,
  bufferCV,
  Cl,
  createStacksPrivateKey,
  getAddressFromPrivateKey,
  signMessageHashRsv,
  TransactionVersion,
} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';
import { concatBytes, hexToBytes } from "@stacks/common";
import { createHash } from "crypto";

const network = new StacksTestnet();
// const secretKey = "753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601"; // Xverse
const secretKey = "81cbdb1230785684d0a49a1e069d6c911366db4af6242b0212b3b3335624a2a301";

async function main() {
  const id_ = "41280769475503092";
  const hashlock_ = "33077a6fd2d083b7918f9f7f5d54788cad71867010632a5d551ac9203571b1d1";
  const timelock_ = BigInt(Math.floor(Date.now() / 1000) + 3600) ;

  const id = BigInt(id_);
  const hashlock = Buffer.from(hashlock_,"hex");
  const timelock = timelock_;
  
  const txOptions = {
    contractAddress: 'ST136VTJP5KQ24EDMKWP0PJ44VVHMGX4KNKAW3XW5',
    contractName: 'stx',
    functionName: 'add-lock-sig',
    functionArgs: [
      uintCV(id),
      bufferCV(hashlock),
      uintCV(timelock),
      bufferCV(Buffer.from(sign(id_,hashlock_,timelock_),"hex"))
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



function sign(id_,hashlock_,timelock_){
  const address = getAddressFromPrivateKey("753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601", TransactionVersion.Testnet);
  console.log(address);

  const id = Cl.uint(id_);
  const hashlock = hashlock_;
  const timelock = Cl.uint(timelock_.toString());

  const idBytes = Cl.serialize(id);
  const hashlockBytes = hexToBytes(hashlock);
  const timelockBytes = Cl.serialize(timelock);

  const message = concatBytes(idBytes, hashlockBytes, timelockBytes);
  const messageHash = createHash("sha256").update(message).digest("hex");

  const signature = signMessageHashRsv({
    messageHash: messageHash,
    privateKey: createStacksPrivateKey("753b7cc01a1a2e86221266a154af739463fce51219d97e4f856cd7200c3bd2a601"),
  }).data;

  return signature;
}




