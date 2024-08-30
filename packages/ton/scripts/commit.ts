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
const srcReceiver: Address = Address.parse("0QDjCQc8cEH-wXETK0Ohoq17GJzgvf3eS6Uw-yrYJt2cMIG5");
const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); 
const messenger: Address = Address.parse("EQB6ZTgwl_FX_fqvrAPTl4MspD_mSMdW4TZ0j7wEfSxqEty9");
const amount = toNano("0.2");

async function run() {
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

  const contractAddress = Address.parse("kQBni1b2nJyY1OaExMDjHlWnZR4-WD4x4vx6UaLA_3AIaC25"); 

  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const commitData: CommitData = {
    hopChains: hopChains,
    hopAssets: hopAssets,
    hopAddresses: hopAddresses,
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
