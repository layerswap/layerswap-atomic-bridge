import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Uncommit, UncommitData,HashedTimeLockTON } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { sleep, toNano } from "../utils/utils";

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

  const contractAddress = Address.parse("kQDj4UDbdWSJm4jVZOkr_hOFMkeUG8BahxApftBKOG4mhENF"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const commitId = 79487511186371839588255465463422044852128997200189785173967264060596494197387n;

  const uncommitData: UncommitData = {
    commitId: commitId,
    $$type: "UncommitData"
  };

  const uncommitMessage: Uncommit = {
    $$type: "Uncommit",
    data: uncommitData
  };

  console.log("Sending Uncommit message...");
  await contractProvider.send(walletSender, { value: toNano("0.1"), bounce: true }, uncommitMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);
