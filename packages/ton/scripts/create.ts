import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { HashedTimeLockTON, Create } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano,sleep } from "../utils/utils";

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

  const hashlock = BigInt("10116354356264177275392909770955841371410553720652860342604159354844513345829"); 
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); 
  const chainId = BigInt(49); 
  const amount = toNano("0.5"); 
  const receiverAddress = Address.parse("0QBdIYx_26bIOerW5uWXaQOahyxZE9GxjySpOiXoIPUaGrPB"); 
  const targetCurrencyReceiverAddress = "addr"; 
  const messenger: Address = Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_");

  const createMessage: Create = {
    $$type: "Create",
    data: {
      __hashlock: hashlock,
      __amount: amount,
      __chainId: chainId,
      __timelock: timelock,
      __phtlcID: 99n,
      __sender: wallet.address,
      __srcAddress: receiverAddress,
      __messenger: messenger,
      __targetCurrencyReceiverAddress: targetCurrencyReceiverAddress,
      $$type: "TonTransferInitiated",
    }
  };

  console.log("Creating HTLC...");
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



