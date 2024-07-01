import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { HashedTimeLockTON, CreateP, StringImpl } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano,sleep, createStrMap, createIntMap } from "../utils/utils";

const chainIDs = createIntMap([
  [0n, 789n],
  [1n, 3245n],
  [2n,563465n]
]);

const initialData: [bigint, StringImpl][] = [
    [0n, { $$type: 'StringImpl', data: "str 1" }],
    [1n, { $$type: 'StringImpl', data: "str 2" }],
    [2n, { $$type: 'StringImpl', data: "str 2" }]

];
const dstAddresses = createStrMap(initialData);

    const dstChainId: bigint = 789n;
    const dstAssetId: bigint = 7890n;
    const dstAddress: string = "dst addr";
    const srcAssetId: bigint = 2134n;
    const srcAddress: Address = Address.parse("0QBdIYx_26bIOerW5uWXaQOahyxZE9GxjySpOiXoIPUaGrPB");
    const timelock = BigInt(Math.floor(Date.now() / 1000) + 60); 
    const messenger: Address = Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_");
    const amount = toNano("0.1");

async function run() {
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


  const createMessage: CreateP = {
    $$type: "CreateP",
    data: { 
        chainIDs: chainIDs,
        dstAddresses: dstAddresses,
        dstChainId: dstChainId,
        dstAssetId: dstAssetId,
        dstAddress: dstAddress,
        srcAssetId: srcAssetId,
        srcAddress: srcAddress,
        timelock: timelock,
        messenger: messenger,
        $$type: "PHTLCData"
    }
  };

  console.log("Creating PHTLC...");
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


