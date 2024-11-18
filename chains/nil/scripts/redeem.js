const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
const createWallet =  require("./createWallet.js");
require('dotenv').config();

const artifactPath = path.resolve(__dirname, "../artifacts/contracts/LayerswapV8.sol/LayerswapV8.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const CONTRACT_ABI = artifact.abi;

(async () => {
  const client = new niljs.PublicClient({
  transport: new niljs.HttpTransport({
    endpoint: process.env.RPC_ENDPOINT,
  }),
  shardId: 1,
});

// using existing wallet
const privKey = "0x3a8334d172393a43750f6b3dca9ef9c72495d626c9e85ca4c73e27a9cb788a44";
const signer = new niljs.LocalECDSAKeySigner({
  privateKey: privKey,
  address: "0x00013b525d7cb63ad8e66b9cc9fca717768d780f",
});

const pubkey = signer.getPublicKey();

const wallet = new niljs.WalletV1({
  pubkey: pubkey,
  salt: 100n,
  shardId: 1,
  client,
  signer,
});

// using new wallet 
// const wallet = (await createWallet.createWallet()).wallet;

const chainId = await client.chainId();
const gasPrice = await client.getGasPrice(1);

    const id = "0x3324742944c68e6143874d2befb52f07868820b19a353d9fe466e8a853e170d1";
    const secret = "0x18ac3e7343f016890c510e93f935261169d9e3f565436429830faf0934f4f8e4";
    const htlcAddress = "0x00019b0a7f7bd293a0d8dc3f2526168247c50edb";

  try {
    const payload = {
        to: htlcAddress,
        refundTo: wallet.address,
        bounceTo: wallet.address,
        abi: CONTRACT_ABI,
        functionName: "redeem",
        args: [
            id,
            secret
        ],
        deploy: false,
        feeCredit: gasPrice * 1_000_000n,
        chainId: chainId,
    };
    const hash = await wallet.sendMessage(payload);

    console.log("redeem transaction hash:", hash);

    const receipt = await niljs.waitTillCompleted(client, hash);
    console.log("receipt:",receipt);
} catch (error) {
    console.error("Error in sendMessage:", error);
}
})();

