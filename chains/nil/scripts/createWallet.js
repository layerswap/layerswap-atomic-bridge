const {
  Faucet,
  HttpTransport,
  LocalECDSAKeySigner,
  PublicClient,
  WalletV1,
  generateRandomPrivateKey,
  waitTillCompleted,
} = require( "@nilfoundation/niljs");
require('dotenv').config();

async function createWallet() {
  const client = new PublicClient({
  transport: new HttpTransport({
    endpoint: process.env.RPC_ENDPOINT,
  }),
  shardId: 1,
});

const faucet = new Faucet(client);

const privKey = generateRandomPrivateKey();
const signer = new LocalECDSAKeySigner({
  privateKey: privKey,
});

const pubkey = signer.getPublicKey();

const wallet = new WalletV1({
  pubkey: pubkey,
  salt: 100n,
  shardId: 1,
  client,
  signer,
});
const walletAddress = wallet.address;

await faucet.withdrawToWithRetry(walletAddress, 100_000_000_000_000n);
await wallet.selfDeploy(true);

console.log("Wallet deployed successfully");

const tokenName = await wallet.setCurrencyName("V8");
await waitTillCompleted(client, tokenName);

const mintToken = await wallet.mintCurrency(100_000_000n);
await waitTillCompleted(client, mintToken);

console.log("private key:",privKey);
console.log("public key:",pubkey);
console.log("wallet address:",wallet.address);
console.log("Wallet creation successfully ended");
return {wallet: wallet, privKey: privKey,pubkey: pubkey};
};

module.exports = {createWallet};