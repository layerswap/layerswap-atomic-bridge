import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Redeem, RedeemData,HashedTimeLockTON} from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { sleep, toNano } from "../utils/utils"

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

  const contractAddress = Address.parse("EQBZrfDyC4__ByU_1jL1APW_CtQZDrqk1QxAybM2mTMYFYCj"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const lockId = BigInt("86063709575516430416322238016776016577783477821483564045133774829893108097467");
  const secret = BigInt("124"); 

  const redeemData: RedeemData = {
    lockId: lockId,
    secret: secret,
    $$type: "RedeemData"
  };

  const redeemMessage: Redeem = {
    $$type: "Redeem",
    data: redeemData
  };

  console.log("Redeeming HTLC...");
  await contractProvider.send(walletSender, { value: toNano("1"), bounce: true }, redeemMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);
