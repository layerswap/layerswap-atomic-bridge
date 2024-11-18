const fs = require("fs");
const path = require("path");
const niljs = require("@nilfoundation/niljs"); 
const {encodeFunctionData,decodeFunctionResult} = require("viem");
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

  const smartContractAddr = "0x00019b0a7f7bd293a0d8dc3f2526168247c50edb";
  const id = "0x3324742944c68e6143874d2befb52f07868820b19a353d9fe466e8a853e170d3";

  const resultsCall = await client.call(
  {
    from: "0x00014df60972b15af36f6353ae3e5a097cb0201c",
    to: smartContractAddr,
    data: encodeFunctionData({
      abi: CONTRACT_ABI,
      functionName: "getDetails",
      args: [id],
    }),
  },
  "latest",
);
console.log(
  "getDetails",
  decodeFunctionResult({
    abi: CONTRACT_ABI,
    functionName: "getDetails",
    data: resultsCall.data,
  }),
);

})();

