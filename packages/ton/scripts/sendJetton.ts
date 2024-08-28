import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address, Cell, beginCell, Slice } from "@ton/ton";
import { toNano, sleep } from "../utils/utils";
import { TokenTransfer,JettonDefaultWallet } from "../build/SampleJetton/tact_JettonDefaultWallet";

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
  const amount = 100n;
  const destination = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1"); 
  const response_destination = Address.parse("0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y"); 
  const custom_payload: Cell | null = beginCell().storeInt(0,32).storeStringTail("Success").endCell();
  const forward_ton_amount = toNano("0.1"); 
  const forward_payload = beginCell().storeStringTail("yuhu").endCell();

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

