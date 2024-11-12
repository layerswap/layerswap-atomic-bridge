const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
const createWallet = require("./createWallet.js");

const artifactPath = path.resolve(__dirname, "../artifacts/contracts/LayerswapV8.sol/LayerswapV8.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const CONTRACT_ABI = artifact.abi;

(async () => {
  const client = new niljs.PublicClient({
  transport: new niljs.HttpTransport({
    endpoint: "https://api.devnet.nil.foundation/api/bot-77/ecde966c3e13c0fd3e8dfd3f883c99fe",
  }),
  shardId: 1,
});

// const privKey = "";
// const signer = new niljs.LocalECDSAKeySigner({
//   privateKey: privKey,
//   address: "",
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
const htlcAddress = "0x00019b0a7f7bd293a0d8dc3f2526168247c50edb";
const id = "0x3324742944c68e6143874d2befb52f07868820b19a353d9fe466e8a853e170d3";

  try {
    const payload = {
        to: htlcAddress,
        refundTo: wallet.address,
        bounceTo: wallet.address,
        abi: CONTRACT_ABI,
        functionName: "refund",
        args: [id],
        deploy: false,
        feeCredit: gasPrice * 1_000_000_000n,
        chainId: chainId,
    };
    const hash = await wallet.sendMessage(payload);

    console.log("refund transaction hash:", hash);``

    const receipt = await niljs.waitTillCompleted(client, hash);
    console.log("receipt:",receipt);
} catch (error) {
    console.error("Error in sendMessage:", error);
}
})();

