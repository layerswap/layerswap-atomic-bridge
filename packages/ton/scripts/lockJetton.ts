import { CommitData, StringImpl, HashedTimeLockTON, dictValueParserStringImpl } from "../build/JettonPreHTLC/tact_HashedTimeLockTON"; 
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address, Cell, beginCell, Slice, Dictionary } from "@ton/ton";
import { toNano, sleep, createStrMap } from "../utils/utils";
import { TokenTransfer,JettonDefaultWallet } from "../build/SampleJetton/tact_JettonDefaultWallet";
import { Builder } from "../build/JettonPreHTLC/tact_HashedTimeLockTON";

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
  const destination = Address.parse("kQAz381AguTykUXr6_IdjhuvnSrqPy2iWB91ODoJsGWd3Xqt");
  const response_destination = Address.parse("0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y");
  const custom_payload: Cell | null = beginCell().storeInt(0,32).storeStringTail("Success").endCell(); 
  const forward_ton_amount = toNano("0.1"); 
  
  const hashlock = BigInt("2953025209335789089534861622343027915865536417638551712283177493");
  const commitId = BigInt(100n); 
  const dstChain: string = "ETH SEPOLIA";
  const dstAsset: string = "STARKNET SEPOLIA ETH";
  const dstAddress: string = "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f";
  const asset: string = "Jetton V8";
  const receiver: Address = Address.parse("UQCA5WdfZ_il-bFktDYao5h4zf7sw_64KZRx1Yc2eJrRC4vm");
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); 
  const messenger: Address = Address.parse("kQD-7i2sk54ZpbykeBppW9OO2KojNVzR5XEfmne-lHlk0byp");
  
  const jettonMasterAddress = Address.parse("kQCdbtPwe4P8eF_rH-o0vu4Plfqrhmr9MR-pKkzH487BLJOQ");
  const htlcJettonWalletAddress = Address.parse("0:b335132de969416a48b97a5e6e089916fb77d2cfaa55ade0621c8840782c5362");

  let b_0 = new Builder();
  b_0.storeInt(hashlock, 257);
  b_0.storeInt(timelock, 257);
  b_0.storeAddress(receiver);
  b_0.storeStringRefTail(asset);
  b_0.storeStringRefTail(dstChain);
  let b_1 = new Builder();
  b_1.storeStringRefTail(dstAddress);
  b_1.storeStringRefTail(dstAsset);
  if (commitId !== null && commitId !== undefined) { b_1.storeBit(true).storeInt(commitId, 257); } else { b_1.storeBit(false); }
  b_1.storeAddress(messenger);
  b_1.storeAddress(jettonMasterAddress);
  let b_2 = new Builder();
  b_2.storeAddress(htlcJettonWalletAddress);
  b_1.storeRef(b_2.endCell());
  b_0.storeRef(b_1.endCell());

  const forward_payload = beginCell().storeUint(1, 1).storeRef(beginCell().storeUint(1558004185, 32).storeBuilder(b_0).endCell()).endCell();

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








