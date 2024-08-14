import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { LockCommitment, LockCommitmentData ,HashedTimeLockTON} from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano, sleep } from "../utils/utils";

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

  const contractAddress = Address.parse("kQDUdA1NLqaognvWvgk--471bY09NIc2qf7qYxmpi-CgrJcD"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);
  const amount = toNano("0.1");

  const lockCommitmentData: LockCommitmentData = {
    commitId: 24716356531191335585328661435771043996539443399925688399959468269084770915966n,
    hashlock: 86063709575516430416322238016776016577783477821483564045133774829893108097467n,
    timelock: BigInt(Math.floor(Date.now() / 1000) + 3600),
    $$type: "LockCommitmentData"
  };

  const lockCommitmentMessage: LockCommitment = {
    $$type: "LockCommitment",
    data: lockCommitmentData
  };

  console.log("Sending LockCommitment message...");
  await contractProvider.send(walletSender, { value: amount, bounce: true }, lockCommitmentMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);

