import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Unlock, UnlockData,HashedTimeLockTON } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { sleep, toNano } from "../utils/utils"

export async function run() {
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

  const contractAddress = Address.parse("kQAHLS7cZ4bzUBFInEP4NG_bJsMMcjHbEYjPWYfpeABR_TpU"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const hashlock = BigInt("95834839512827776901986325239264454031944797482888037141762408015567291439797"); 

  const unlockData: UnlockData = {
    hashlock: hashlock,
    $$type: "UnlockData"
  };

  const unlockMessage: Unlock = {
    $$type: "Unlock",
    data: unlockData
  };

  console.log("Sending Unlock message...");
  await contractProvider.send(walletSender, { value: toNano("0.3"), bounce: true }, unlockMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);
