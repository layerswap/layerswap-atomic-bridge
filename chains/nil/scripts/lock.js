const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
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

const privKey = "0x8ffeaab7ddc21dbc0825bfa5ef1d2667bf2309ecfcbd9680fa3211ec99867b68";
const signer = new niljs.LocalECDSAKeySigner({
  privateKey: privKey,
  address: "0x00019a089c3fbff20e9c5a09e80c3bc0e876cedc",
});

const pubkey = signer.getPublicKey();

const wallet = new niljs.WalletV1({
  pubkey: pubkey,
  salt: 100n,
  shardId: 1,
  client,
  signer,
});

const chainId = await client.chainId();
const gasPrice = await client.getGasPrice(1);

    const Id = "0x3324742944c68e6143874d2befb52f07868820b19a353d9fe466e8a853e170d1";
    const hashlock = "0xddfafe7925d46e633decb4cb3c933b4c2f7d56679487f4b88ea3e6422eb2b81c";
    const dstChain = "DestinationChain";
    const dstAsset = "DestinationAsset";
    const dstAddress = "0xDestinationAddress";
    const srcAsset = "NIL";
    const srcReceiver = "0x00019f974140e862f19a60f2b6ffc7049b1e3245";
    const timelock = (await client.getBlockByNumber("latest")).number + 10;
    const htlcAddress = "0x00019b0a7f7bd293a0d8dc3f2526168247c50edb";

  try {
    const payload = {
        to: htlcAddress,
        refundTo: wallet.address,
        bounceTo: wallet.address,
        abi: CONTRACT_ABI,
        functionName: "lock",
        args: [
            Id,
            hashlock,
            timelock,
            srcReceiver,
            srcAsset,
            dstChain,
            dstAddress,
            dstAsset
        ],
        deploy: false,
        feeCredit: gasPrice * 1_000_000n,
        value: 98346n,
        chainId: chainId,
    };
    const hash = await wallet.sendMessage(payload);

    console.log("lock transaction hash:", hash);

    const receipt = await niljs.waitTillCompleted(client, hash);
    console.log("receipt:",receipt);
} catch (error) {
    console.error("Error in sendMessage:", error);
}
})();

