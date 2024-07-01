import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { HashedTimeLockTON,StringImpl, CreatePBatch, ChainIDs, DstAddresses } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano,sleep,createAddrMap,createChainIDMap,createIntMap,createStrMap, createDstAddrMap } from "../utils/utils";

const chainid: [bigint, bigint][] = [
    [0n, 1234n],
    [1n, 4321n],
  ];
  
const chainIds: [bigint, ChainIDs][] = [
    [0n, { $$type: 'ChainIDs', data: createIntMap(chainid) }], 
    [1n, { $$type: 'ChainIDs', data: createIntMap(chainid) }], 
  ];

const initDataDstAddr: [bigint, StringImpl][] = [
    [0n, { $$type: 'StringImpl', data: "dst addr 1" }],
    [1n, { $$type: 'StringImpl', data: "dst addr 2" }]
];

const dstAddresses: [bigint, DstAddresses][] = [
    [0n,  { $$type: 'DstAddresses', data: createStrMap(initDataDstAddr) }],
    [1n,  { $$type: 'DstAddresses', data: createStrMap(initDataDstAddr)}]
];

const dstChainId: [bigint, bigint][] = [
    [0n, 1234n],
    [1n, 4321n]
];

const initialDataDstAddr: [bigint, StringImpl][] = [
    [0n, { $$type: 'StringImpl', data: "Example Data 1" }],
    [1n, { $$type: 'StringImpl', data: "Example Data 2" }]
];

const srcAddress: [bigint, Address][] = [
    [0n, Address.parse("0QBdIYx_26bIOerW5uWXaQOahyxZE9GxjySpOiXoIPUaGrPB") ],
    [1n, Address.parse("0QBdIYx_26bIOerW5uWXaQOahyxZE9GxjySpOiXoIPUaGrPB")]
];

const timelock: [bigint, bigint][] = [
    [0n, BigInt(Math.floor(Date.now() / 1000) + 24*60*60)],
    [1n, BigInt(Math.floor(Date.now() / 1000) + 24*60*120)]
];

const messenger: [bigint, Address][] = [
    [0n, Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_") ],
    [1n, Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_")]
];

const amount: [bigint, bigint][] = [
    [0n, toNano("0.3")],
    [1n, toNano("0.2")]
];


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


  const createMessage: CreatePBatch = {
    $$type: "CreatePBatch",
    data: {
        $$type: "CreatePBatchData",
        chainIds: createChainIDMap(chainIds),
        dstAddresses: createDstAddrMap(dstAddresses),
        dstChainId: createIntMap(dstChainId),
        dstAssetId: createIntMap(dstChainId),
        dstAddress: createStrMap(initialDataDstAddr),
        srcAssetId: createIntMap(chainid),
        srcAddress: createAddrMap(srcAddress),
        timelock: createIntMap(timelock),
        messenger: createAddrMap(messenger),
        amount: createIntMap(amount)
    }
  };

  console.log("Creating PHTLC...");
  await htlcProvider.send(walletSender, { value: toNano("1"), bounce: true }, createMessage);
  

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");

  
}

run().catch(console.error);


