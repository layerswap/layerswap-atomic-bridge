import { CommitData, StringImpl, LayerswapV8Jetton, dictValueParserStringImpl } from "../build/JettonPreHTLC/tact_LayerswapV8Jetton"; 
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address, Cell, beginCell, Slice, Dictionary } from "@ton/ton";
import { toNano, sleep, createStrMap } from "../utils/utils";
import { TokenTransfer,JettonDefaultWallet } from "../build/SampleJetton/tact_JettonDefaultWallet";
import { Builder } from "../build/JettonPreHTLC/tact_LayerswapV8Jetton";

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

 // jetton wallet address of lp 
  const contractAddress = Address.parse("0:53ea76a0ebb7746ae9d04d2445424c3a9de2046e70ae8adbae883a47e1c5ef73");
  
  const newContract = JettonDefaultWallet.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const queryId = BigInt(Date.now()); 
  const amount = 19n;
  const destination = Address.parse("kQCEheJe-tMhwQ2XeILH5avb3GcOlWCYujGUiaMPAyBI_xqE");
  const response_destination = Address.parse("0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y");
  const custom_payload: Cell | null = beginCell().storeInt(0,32).storeStringTail("Success").endCell(); 
  const forward_ton_amount = toNano("0.1"); 
  
  const hashlock = BigInt("96184405605761239365615141159737855805714574759278034204903698408753403233303");
  const Id = BigInt(64n); 
  const dstChain: string = "STARKNET_SEPOLIA";
  const dstAsset: string = "ETH";
  const dstAddress: string = "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f";
  const srcAsset: string = "Jetton V8";
  const srcReceiver: Address = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1");
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 100); 
  const messenger: Address = Address.parse("EQB6ZTgwl_FX_fqvrAPTl4MspD_mSMdW4TZ0j7wEfSxqEty9");
  
  const jettonMasterAddress = Address.parse("kQCdbtPwe4P8eF_rH-o0vu4Plfqrhmr9MR-pKkzH487BLJOQ");
  const htlcJettonWalletAddress = Address.parse("0:0e27a30ebae5144d77e61b3fb451cc6284947075ab0f5cac8961d10c00ceaf66");

  let b_0 = new Builder();
  b_0.storeInt(Id, 257);
  b_0.storeInt(timelock, 257);
  b_0.storeAddress(srcReceiver);
  b_0.storeStringRefTail(srcAsset);
  b_0.storeStringRefTail(dstChain);
  let b_1 = new Builder();
  b_1.storeStringRefTail(dstAddress);
  b_1.storeStringRefTail(dstAsset);
  b_1.storeInt(hashlock, 257);
  b_1.storeAddress(jettonMasterAddress);
  b_1.storeAddress(htlcJettonWalletAddress);
  b_0.storeRef(b_1.endCell());
  const forward_payload = beginCell().storeUint(1, 1).storeRef(beginCell().storeUint(317164721, 32).storeBuilder(b_0).endCell()).endCell();

  const tokenTransferMessage: TokenTransfer = {
    $$type: 'TokenTransfer',
    queryId,
    amount,
    destination,
    response_destination,
    custom_payload,
    forward_ton_amount,
    forward_payload,
  };

  console.log("Sending TokenTransfer message...");
  await contractProvider.send(walletSender, { value: toNano("0.2"), bounce: true }, tokenTransferMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);








