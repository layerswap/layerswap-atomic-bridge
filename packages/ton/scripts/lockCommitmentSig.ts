import { beginCell, Cell } from "@ton/ton"; 
import { TonClient, WalletContractV4, Address } from "@ton/ton"; 
import { LockCommitmentSig, LockCommitmentSigData, HashedTimeLockTON } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { getHttpEndpoint } from "@orbs-network/ton-access"; 
import { toNano, sleep } from "../utils/utils"; 
import { mnemonicToWalletKey, sign, signVerify } from 'ton-crypto';

async function run() {
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  const mnemonic = "pretty electric october neck alley tiger action assault garlic divide oppose exist online cluster luxury clump kangaroo number away analyst attitude digital zebra world"; 
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
  if (!await client.isContractDeployed(wallet.address)) {
    return console.log("Wallet is not deployed");
  }

  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  const contractAddress = Address.parse("EQBM6ThZis6a5Zxd5ddfxVWbCGJfUCmnZZVxQJ4Th9h1j5a9"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);
  const amount = toNano("0.1");

  const commitId = BigInt("1000001");
  const hashlock = BigInt("66281763433596058795635477366290197584828204308153459951051320666201413942154");
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600);

  const dataCell: Cell = beginCell()
      .storeInt(hashlock, 257)
      .storeInt(timelock, 257)
      .endCell();

  const dataSlice = dataCell.beginParse(); 

  const signatureBuffer = sign(dataCell.hash(), key.secretKey);
  const signatureCell = beginCell().storeBuffer(signatureBuffer).endCell();
  const signatureSlice = signatureCell.beginParse();

console.log("signiture verified off chain: ",signVerify(dataCell.hash(),signatureBuffer,key.publicKey));
  
const lockCommitmentSigData: LockCommitmentSigData = {
      commitId: commitId,
      data: dataSlice, 
      signature: signatureSlice,
      $$type: "LockCommitmentSigData"
  };

  const lockCommitmentSigMessage: LockCommitmentSig = {
      $$type: "LockCommitmentSig",
      data: lockCommitmentSigData
  };

  console.log("Sending LockCommitmentSig message...");
  await contractProvider.send(walletSender, { value: amount, bounce: true }, lockCommitmentSigMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}
run().catch(console.error);


