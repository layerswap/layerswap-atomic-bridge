import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { HashedTimeLockTON, ConvertPBatch } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano,sleep,createIntMap } from "../utils/utils";

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

  const htlcAddress = Address.parse("EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG"); 
  const htlcContract = HashedTimeLockTON.fromAddress(htlcAddress);
  const htlcProvider = client.open(htlcContract);
  const amount = toNano("0.4");

  const phtlcIDs: [bigint, bigint][] = [
    [0n, 1n],
    [1n, 2n]
];

const hashlocks: [bigint, bigint][] = [
    [0n, 38384365469971069602921070204605135936563549811675016427642203550256920540258n],
    [1n, 32540407902597021040394623474102147349491756005932804701440867269234622944389n]
];

  const createMessage: ConvertPBatch = {
      $$type: "ConvertPBatch",
      data: {
          $$type: "ConvertPBatchData",
          phtlcIDs: createIntMap(phtlcIDs),
          hashlocks: createIntMap(hashlocks)
      }
  };

  console.log("Converting PHTLC...");
  await htlcProvider.send(walletSender, { value: amount, bounce: true }, createMessage);
  

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");

  
}

run().catch(console.error);


