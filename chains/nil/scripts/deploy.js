const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
require('dotenv').config();

const artifactPath = path.resolve(__dirname, "../artifacts/contracts/LayerswapV8.sol/LayerswapV8.json");
const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
const CONTRACT_BYTECODE = artifact.bytecode;
const CONTRACT_ABI = artifact.abi;

(async () => {
  const client = new niljs.PublicClient({
    transport: new niljs.HttpTransport({
      endpoint: process.env.RPC_ENDPOINT,
    }),
    shardId: 1,
  });

  const faucet = new niljs.Faucet(client);
  const signer = new niljs.LocalECDSAKeySigner({
    privateKey: niljs.generateRandomPrivateKey(),
  });

  const gasPrice = await client.getGasPrice(1);
  const pubkey = await signer.getPublicKey();
  const wallet = new niljs.WalletV1({
    pubkey: pubkey,
    salt: BigInt(Math.floor(Math.random() * 10000)),
    shardId: 1,
    client,
    signer,
  });

  const walletAddress = wallet.address;
  console.log("walletAddress",walletAddress)
  await faucet.withdrawToWithRetry(walletAddress, niljs.convertEthToWei(10));
  await wallet.selfDeploy(true);

  const { address: HTLCAddress, hash: HTLCDeploymentHash } =
    await wallet.deployContract({
      bytecode: CONTRACT_BYTECODE,
      abi: CONTRACT_ABI,
      args: [],
      value: 0n,
      feeCredit: 10_000_000n * gasPrice,
      salt: BigInt(Math.floor(Math.random() * 10000)),
      shardId: 1,
    });

  console.log("Contract deployed at address:", `https://explore.nil.foundation/address/${HTLCAddress}`);
  console.log("transaction hash:", `https://explore.nil.foundation/tx/${HTLCDeploymentHash}`);

})();


