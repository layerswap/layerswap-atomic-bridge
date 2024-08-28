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

  const contractAddress = Address.parse("EQDj4UDbdWSJm4jVZOkr_hOFMkeUG8BahxApftBKOG4mhPjP"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);
  const amount = toNano("0.1");

  const lockCommitmentData: LockCommitmentData = {
    commitId: 79487511186371839588255465463422044852128997200189785173967264060596494197385n,
    hashlock: 87562466615021115273923358655790804049477827703244008055029249926713965109410n,
    timelock: BigInt(Math.floor(Date.now() / 1000) + 3600),
    $$type: "LockCommitmentData"
  };

  const lockCommitmentMessage: LockCommitment = {
    $$type: "LockCommitment",
    data: lockCommitmentData
  };

  console.log("Sending LockCommitment message...");
  await contractProvider.send(walletSender, { value: amount,bounce: true }, lockCommitmentMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);

