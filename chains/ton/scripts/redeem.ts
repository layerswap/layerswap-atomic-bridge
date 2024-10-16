import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { Redeem, RedeemData,HashedTimeLockTON} from "../build/HashedTimeLockTON/tact_HashedTimeLockTON"; 
import { sleep, toNano } from "../utils/utils"

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

  const contractAddress = Address.parse("EQDj4UDbdWSJm4jVZOkr_hOFMkeUG8BahxApftBKOG4mhPjP"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const lockId = BigInt("58176249714542312020208442982137995642944563469145106924669911026287930636180");
  const secret = BigInt("87562466615021115273923358655790804049477827703244008055029249926713965109410"); 

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
  await contractProvider.send(walletSender, { value: toNano("0.2"), bounce: true }, redeemMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);
