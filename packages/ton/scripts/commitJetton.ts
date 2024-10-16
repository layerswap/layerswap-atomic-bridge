import { dictValueParserStringImpl } from "../build/JettonPreHTLC/tact_LayerswapV8Jetton"; 
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

  const contractAddress = Address.parse("0:53ea76a0ebb7746ae9d04d2445424c3a9de2046e70ae8adbae883a47e1c5ef73");

  const newContract = JettonDefaultWallet.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const queryId = BigInt(Date.now()); 
  // const amount = 5000000000000n;  for LP
  const amount = 10n;
  const destination = Address.parse("kQCEheJe-tMhwQ2XeILH5avb3GcOlWCYujGUiaMPAyBI_xqE"); 
  const response_destination = Address.parse("0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y"); 
  const custom_payload: Cell | null = beginCell().storeInt(0,32).storeStringTail("Success").endCell(); 
  const forward_ton_amount = toNano("0.1"); 
const hopChains = createStrMap([
    [0n, { $$type: 'StringImpl', data: "ARBITRUM_SEPOLIA" }]
  ]);
  
  const hopAssets = createStrMap([
    [0n, { $$type: 'StringImpl', data: "USDC" }]
  ]);
  
  const hopAddresses = createStrMap([
    [0n, { $$type: 'StringImpl', data: "0xF6517026847B4c166AAA176fe0C5baD1A245778D" }]
  ]);
  
  const dstChain: string = "ARBITRUM_SEPOLIA";
  const dstAsset: string = "USDC";
  const dstAddress: string = "0xF6517026847B4c166AAA176fe0C5baD1A245778D";
  const srcAsset: string = "TESTJ";
  const srcReceiver: Address = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1");
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 1200); 
  const senderPubKey = BigInt("93313405977870926073550938810831536324369550307664963791822499149910443974887");
  const jettonMasterAddress = Address.parse("kQCdbtPwe4P8eF_rH-o0vu4Plfqrhmr9MR-pKkzH487BLJOQ");
  const htlcJettonWalletAddress = Address.parse("0:0e27a30ebae5144d77e61b3fb451cc6284947075ab0f5cac8961d10c00ceaf66");

  let b_0 = new Builder();
  b_0.storeStringRefTail(dstChain);
  b_0.storeStringRefTail(dstAsset);
  let b_1 = new Builder();
  b_1.storeStringRefTail(dstAddress);
  b_1.storeStringRefTail(srcAsset);
  b_1.storeAddress(srcReceiver);
  b_1.storeInt(timelock, 257);
  b_1.storeAddress(jettonMasterAddress);
  let b_2 = new Builder();
  b_2.storeAddress(htlcJettonWalletAddress);
  b_2.storeInt(senderPubKey, 257);
  b_2.storeDict(hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
  b_2.storeDict(hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
  b_2.storeDict(hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
  b_1.storeRef(b_2.endCell());
  b_0.storeRef(b_1.endCell());
  
  const forward_payload = beginCell().storeUint(1, 1).storeRef(beginCell().storeUint(1734998782, 32).storeBuilder(b_0).endCell()).endCell();

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








