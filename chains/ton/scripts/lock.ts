import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { LayerswapV8,Lock, } from "../build/HashedTimeLockTON/tact_LayerswapV8"; 
import { toNano, sleep } from "../utils/utils";

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

  const contractAddress = Address.parse("kQBYNb_1ocBx1NPRjncXDU5P343byJmI0mGeyb3rF59v_0y0"); 
  const newContract = LayerswapV8.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const hashlock = BigInt("96184405605761239365615141159737855805714574759278034204903698408753403233303"); 
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 100); 
  const srcReceiver = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1"); 
  const srcAsset = "TON"; 
  const dstChain = "STARKNET_SEPOLIA"; 
  const dstAddress = "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f"; 
  const dstAsset = "ETH"; 
  const Id = BigInt(101n); 

  const lockMessage: Lock = {
    $$type: "Lock",
    Id: Id,
    hashlock: hashlock,
    timelock: timelock,
    srcReceiver: srcReceiver,
    srcAsset: srcAsset,
    dstChain: dstChain,
    dstAddress: dstAddress,
    dstAsset: dstAsset,
  };

  console.log("Sending Lock message...");
  await contractProvider.send(walletSender, { value: toNano("0.5"), bounce: true }, lockMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);
