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

  const contractAddress = Address.parse("EQDj4UDbdWSJm4jVZOkr_hOFMkeUG8BahxApftBKOG4mhPjP"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);
  const amount = toNano("0.1");

  const commitId = BigInt("79487511186371839588255465463422044852128997200189785173967264060596494197386");
  const hashlock = BigInt("58176249714542312020208442982137995642944563469145106924669911026287930636180");
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
      publicKey: BigInt('0x' + key.publicKey.toString('hex')), 
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


