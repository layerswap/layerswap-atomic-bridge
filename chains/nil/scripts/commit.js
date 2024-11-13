const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
const createWallet = require("../scripts/createWallet.js");
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

// using existing wallet
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

// using newly generated wallet 
// const walletInstance = await createWallet.createWallet();
// const wallet = walletInstance.wallet;

    const chainId = await client.chainId();
    const gasPrice = await client.getGasPrice(1);

    const hopChains = ["ChainA", "ChainB", "ChainC"];
    const hopAssets = ["Asset1", "Asset2", "Asset3"];
    const hopAddresses = [
        "0xAddress1",
        "0xAddress2",
        "0xAddress3"
    ];
    const dstChain = "DestinationChain";
    const dstAsset = "DestinationAsset";
    const dstAddress = "0xDestinationAddress";
    const srcAsset = "NIL";
    const srcReceiver = "0x000145bc26f60bbd655ae18e376c2b46789b8268";
    const timelock = (await client.getBlockByNumber("latest")).number + 10000000;
    const value = 15_000_000n;
    const senderPubKey = niljs.toHex(Uint8Array.from(wallet.pubkey));
    const htlcAddress = "0x00019b0a7f7bd293a0d8dc3f2526168247c50edb";

  try {
    const payload = {
        to: htlcAddress,
        refundTo: wallet.address,
        bounceTo: wallet.address,
        abi: CONTRACT_ABI,
        functionName: "commit",
        args: [
            hopChains,
            hopAssets,
            hopAddresses,
            dstChain,
            dstAsset,
            dstAddress,
            srcAsset,
            srcReceiver,
            senderPubKey,
            timelock
        ],
        deploy: false,
        feeCredit: gasPrice * 1_000_000n,
        value: value,
        chainId: chainId,
    };
    const hash = await wallet.sendMessage(payload);

    console.log("commit transaction hash:", hash);
    
    const receipt = await niljs.waitTillCompleted(client, hash);
    console.log("log receipt:",receipt)
  } catch (error) {
    console.error("Error in sendMessage:", error);
  }
})();

