import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Commit, CommitData, StringImpl,HashedTimeLockTON } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano, sleep, createStrMap, createIntMap } from "../utils/utils";

const hopChains = createStrMap([
  [0n, { $$type: 'StringImpl', data: "chain 1" }],
  [1n, { $$type: 'StringImpl', data: "chain 2" }],
  [2n, { $$type: 'StringImpl', data: "chain 3" }]
]);

const hopAssets = createStrMap([
  [0n, { $$type: 'StringImpl', data: "asset 1" }],
  [1n, { $$type: 'StringImpl', data: "asset 2" }],
  [2n, { $$type: 'StringImpl', data: "asset 3" }]
]);

const hopAddresses = createStrMap([
  [0n, { $$type: 'StringImpl', data: "address 1" }],
  [1n, { $$type: 'StringImpl', data: "address 2" }],
  [2n, { $$type: 'StringImpl', data: "address 3" }]
]);

const dstChain: string = "STARKNET SEPOLIA";
const dstAsset: string = "STARKNET SEPOLIA";
const dstAddress: string = "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f";
const srcAsset: string = "TON";
const srcReceiver: Address = Address.parse("0QCA5WdfZ_il-bFktDYao5h4zf7sw_64KZRx1Yc2eJrRCzBs");
const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); 
const messenger: Address = Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_");
const amount = toNano("0.7");

async function run() {
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  const mnemonic = "thunder ignore ankle edit height leader drip motor leave expect dune online favorite ankle tail spoon detail glory flush inform estate field swear"; 
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
  if (!await client.isContractDeployed(wallet.address)) {
    return console.log("Wallet is not deployed");
  }

  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  const contractAddress = Address.parse("EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2"); 

  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const commitData: CommitData = {
    HopChains: hopChains,
    HopAssets: hopAssets,
    HopAddresses: hopAddresses,
    dstChain: dstChain,
    dstAsset: dstAsset,
    dstAddress: dstAddress,
    srcAsset: srcAsset,
    srcReceiver: srcReceiver,
    timelock: timelock,
    messenger: messenger,
    $$type: "CommitData"
  };

  const commitMessage: Commit = {
    $$type: "Commit",
    data: commitData
  };

  console.log("Sending Commit message...");
  await contractProvider.send(walletSender, { value: amount, bounce: true }, commitMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);
