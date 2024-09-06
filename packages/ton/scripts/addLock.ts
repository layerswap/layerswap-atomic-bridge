import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address } from "@ton/ton";
import { AddLock ,LayerswapV8} from "../build/HashedTimeLockTON/tact_LayerswapV8"; 
import { toNano, sleep } from "../utils/utils";

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

  const contractAddress = Address.parse("EQD55cXZ48PdxZjZdgBSBdLVTVKLRj8p0619BEr7QRSDeLF_"); 
  const newContract = LayerswapV8.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);
  const amount = toNano("0.1");

  const addLockMessage: AddLock = {
    $$type: "AddLock",
    Id: 101n,
    hashlock: 20548678321456934993365688499927729765381779202072073513007694262427584456407n,
    timelock: BigInt(Math.floor(Date.now() / 1000) + 3600),
  };

  console.log("Sending AddLock message...");
  await contractProvider.send(walletSender, { value: amount,bounce: true }, addLockMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);

