import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4,Address } from "@ton/ton";
import { HashedTimeLockTON,CreateBatch, StringImpl } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { toNano,sleep,createAddrMap,createIntMap,createStrMap } from "../utils/utils";

export async function run() {
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

  const _srcAddresses: [bigint, Address][] = [
    [0n, Address.parse("0QCQ9QsXNLAV9a-2ef_-eYill7RaPE8Bctj97uL7lCZe_bmc")],
    [1n, Address.parse("0QCQ9QsXNLAV9a-2ef_-eYill7RaPE8Bctj97uL7lCZe_bmc")],
    [2n, Address.parse("0QCQ9QsXNLAV9a-2ef_-eYill7RaPE8Bctj97uL7lCZe_bmc")]
];

    const _hashlocks: [bigint, bigint][] = [
      [0n, 44691657908674376667616866962941651559243289428157317431966495019804889488790n],
      [1n, 62801403391899223333995163013946062884434488808459511848836655963040820535805n],
      [2n, 62060124400081153919194359691089091145783139253394647617190179850013170367366n],
    ];

    const _timelocks: [bigint, bigint][] = [
        [0n, BigInt(Math.floor(Date.now() / 1000) + 24*60*60)],
        [1n, BigInt(Math.floor(Date.now() / 1000) + 24*60*120)],
        [2n, BigInt(Math.floor(Date.now() / 1000) + 24*60*60)]
    ];

    const _chainIDs: [bigint, bigint][] = [
        [0n, 1342n],
        [1n, 3245n],
        [2n, 333n]
    ];
    
    const _targetCurrencyReceiversAddresses: [bigint, StringImpl][] = [
        [0n,  { $$type: 'StringImpl', data: "addr1" }],
        [1n,  { $$type: 'StringImpl', data: "addr2" }],
        [2n,  { $$type: 'StringImpl', data: "addr3" }]
    ];

    const _amounts: [bigint, bigint][] = [
        [0n, toNano("0.3")],
        [1n, toNano("0.2")],
        [2n, toNano("0.4")]
    ];

    const _phtlcIds: [bigint, bigint][] = [
        [0n, 0n],
        [1n, 0n],
        [2n, 0n]
    ];

    const _messengers: [bigint, Address][] = [
        [0n, Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_")],
        [1n, Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_")],
        [2n, Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_")]
    ];

  const createMessage: CreateBatch = {
    $$type: "CreateBatch",
    data: {
        $$type: "CreateBatchData",
        _srcAddresses: createAddrMap(_srcAddresses),
        _hashlocks: createIntMap(_hashlocks),
        _timelocks: createIntMap(_timelocks),
        _chainIDs: createIntMap(_chainIDs),
        _targetCurrencyReceiversAddresses: createStrMap(_targetCurrencyReceiversAddresses),
        _amounts: createIntMap(_amounts),
        _phtlcIds: createIntMap(_phtlcIds),
        _messengers: createAddrMap(_messengers)
    }
  };

  console.log("Creating HTLC...");
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



