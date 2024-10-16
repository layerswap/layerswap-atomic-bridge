import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Commit,LayerswapV8 } from "../build/HashedTimeLockTON/tact_LayerswapV8"; 
import { toNano, sleep, createStrMap } from "../utils/utils";

const hopChains = createStrMap([
  [0n, { $$type: 'StringImpl', data: "STARKNET_SEPOLIA" }]
]);

const hopAssets = createStrMap([
  [0n, { $$type: 'StringImpl', data: "ETH" }]
]);

const hopAddresses = createStrMap([
  [0n, { $$type: 'StringImpl', data: "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f" }]
]);

const dstChain: string = "STARKNET_SEPOLIA";
const dstAsset: string = "ETH";
const dstAddress: string = "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f";
const srcAsset: string = "TON";
const srcReceiver: Address = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1");
const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); 
const amount = toNano("0.2");
const senderPubKey = BigInt("93313405977870926073550938810831536324369550307664963791822499149910443974887");

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

  const contractAddress = Address.parse("EQBYNb_1ocBx1NPRjncXDU5P343byJmI0mGeyb3rF59v__c-"); 

  const newContract = LayerswapV8.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);


  const commitMessage: Commit = {
    $$type: "Commit",
        hopChains: hopChains,
        hopAssets: hopAssets,
        hopAddresses: hopAddresses,
        dstChain: dstChain,
        dstAsset: dstAsset,
        dstAddress: dstAddress,
        srcAsset: srcAsset,
        srcReceiver: srcReceiver,
        timelock: timelock,
        senderPubKey: senderPubKey,
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
