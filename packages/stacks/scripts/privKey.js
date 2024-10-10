import { TransactionVersion } from "@stacks/transactions";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";

// const mnemonic = "twice kind fence tip hidden tilt action fragile skin nothing glory cousin green tomorrow spring wrist shed math olympic multiply hip blue scout claw"; //Xverse
const mnemonic = 'empty nothing airport topic talent movie owner boil winter piano near cook dry patrol trumpet now average warfare patch public bag divide torch shine'; // leather


const wallet = await generateWallet({
  secretKey: mnemonic,
  password: 'optional-password',
});

const account = wallet.accounts[0];
const address = getStxAddress({
  account,
  transactionVersion: TransactionVersion.Testnet
});

console.log("address: ",address); 
console.log("stx private key: ",account.stxPrivateKey)