import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Messenger, HTLCNotify } from "../build/Messenger/tact_Messenger"; 
import { toNano,sleep } from "../utils/utils"

async function run() {
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  const mnemonic = "thunder ignore ankle edit height leader drip motor leave expect dune online favorite ankle tail spoon detail glory flush inform estate field swear reason"; 
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
  if (!await client.isContractDeployed(wallet.address)) {
    return console.log("Wallet is not deployed");
  }

  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  const messengerAddress = Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_"); 
  const messengerContract = Messenger.fromAddress(messengerAddress);
  const messengerProvider = client.open(messengerContract);

  const htlcID = BigInt("2001");
  const sender = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1");
  const receiver = Address.parse("0QCQ9QsXNLAV9a-2ef_-eYill7RaPE8Bctj97uL7lCZe_bmc");
  const amount = toNano("10");
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 60000);
  const hashlock = BigInt("7958056465735075406484878961687772953814868713985062931631406200494411030464");
  const dstAddress = "My address where I want to get funds";
  const phtlcID = BigInt("2000");
  
  const notification: HTLCNotify = {
    $$type: "HTLCNotify",
    data: {
        htlcID: htlcID,
        sender: sender,
        receiver: receiver,
        amount: amount,
        timelock: timelock,
        hashlock: hashlock,
        dstAddress: dstAddress,
        phtlcID: phtlcID,
        $$type: "HTLCNotification"
    }
  };

  console.log("Notifying HTLC...");
  await messengerProvider.send(walletSender, { value: toNano("0.1 "), bounce: true }, notification);
  

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");

}

run().catch(console.error);





