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

  const contractAddress = Address.parse("kQBM6ThZis6a5Zxd5ddfxVWbCGJfUCmnZZVxQJ4Th9h1jy03"); 
  const newContract = HashedTimeLockTON.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  const lockId = BigInt("66281763433596058795635477366290197584828204308153459951051320666201413942154");
  const secret = BigInt("53471859568453023350508915562483685963002972655043732148592290075919844900864"); 

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
