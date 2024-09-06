import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Refund,LayerswapV8 } from "../build/HashedTimeLockTON/tact_LayerswapV8"; 
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

  const contractAddress = Address.parse("kQD55cXZ48PdxZjZdgBSBdLVTVKLRj8p0619BEr7QRSDeAr1"); 
  const newContract = LayerswapV8.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const Id = BigInt("101"); 

  const unlockMessage: Refund = {
    $$type: "Refund",
    Id: Id,
  };

  console.log("Sending Refund message...");
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
