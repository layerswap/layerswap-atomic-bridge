import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { BatchRedeem, HashedTimeLockTON } from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { sleep, toNano,createIntMap } from "../utils/utils";

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


  const hashlock: [bigint, bigint][] = [
    [0n, 84875671184144782158460785231107441555747022468917464589870535198570088211076n],
    [1n, 62801403391899223333995163013946062884434488808459511848836655963040820535805n],
    [2n, 62060124400081153919194359691089091145783139253394647617190179850013170367366n],
    [3n, 98500131703673639191943596910894640911457831392533962060124400081157617190176n]
];

    const secret: [bigint, bigint][] = [
        [0n, 131570008936n],
        [1n, 103157955389n],
        [2n, 23670856936n],
        [3n, 23453525324n]
    ];

  const redeemMessage: BatchRedeem = {
    $$type: "BatchRedeem",
    data: {
        $$type: "BatchRedeemData",
        htlcIDs: createIntMap(hashlock),
        secrets: createIntMap(secret)
    }
  };

  console.log("Redeeming HTLC...");
  await htlcProvider.send(walletSender, { value: toNano("0.8"), bounce: true }, redeemMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");

}

run().catch(console.error);


