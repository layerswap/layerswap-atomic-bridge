import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { HashedTimeLockTON, RefundP } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { sleep,toNano } from "../utils/utils";

export async function run() {
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

  const htlcAddress = Address.parse("EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG"); 
  const htlcContract = HashedTimeLockTON.fromAddress(htlcAddress);
  const htlcProvider = client.open(htlcContract);

  const refundMessage: RefundP = {
      $$type: "RefundP",
      phtlcID: 2n
  };

  console.log("Refunding PHTLC...");
 await htlcProvider.send(walletSender, { value: toNano("0.1"), bounce: true }, refundMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");

}

run().catch(console.error);
