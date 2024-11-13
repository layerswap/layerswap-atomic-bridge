const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
const createWallet = require("./createWallet.js");
require('dotenv').config();

const artifactPath = path.resolve(__dirname, "../artifacts/contracts/LayerswapV8.sol/LayerswapV8.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const CONTRACT_ABI = artifact.abi;

(async () => {
  const client = new niljs.PublicClient({
  transport: new niljs.HttpTransport({
    endpoint: process.env.RPC_ENDPOINT,
    timeout: 50000,
  }),
  shardId: 1,
});

// const privKey = "";
// const signer = new niljs.LocalECDSAKeySigner({
//   privateKey: privKey,
//   address: ""
// });

// const pubkey = signer.getPublicKey();

// const wallet = new niljs.WalletV1({
//   pubkey: pubkey,
//   salt: 100n,
//   shardId: 1,
//   client,
//   signer,
// });

const wallet = (await createWallet.createWallet()).wallet;

const chainId = await client.chainId();
const gasPrice = await client.getGasPrice(1);

    const id = "0x24A7A0A3630D6B6E4DF04CF38322FF3F0F511FE8C64552CD4DBE4C79D34F6BE5";
    const hashlock = "0xddfafe7925d46e633decb4cb3c933b4c2f7d56679487f4b88ea3e6422eb2b81c";
    const timelock = (await client.getBlockByNumber("latest")).number + 10;
    const htlcAddress = "0x00019b0a7f7bd293a0d8dc3f2526168247c50edb";

  try {
    const payload = {
        to: htlcAddress,
        refundTo: wallet.address,
        bounceTo: wallet.address,
        abi: CONTRACT_ABI,
        functionName: "addLock",
        args: [id,
            hashlock,
            timelock
        ],
        deploy: false,
        feeCredit: gasPrice * 1_000_000n,
        chainId: chainId,
    };
    const hash = await wallet.sendMessage(payload);

    console.log("addLock transaction hash:", hash);
    
    const receipt = await niljs.waitTillCompleted(client, hash);
    console.log("receipt:",receipt);
  } catch (error) {
    console.error("Error in sendMessage:", error);
  }
})();

