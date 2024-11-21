const hre = require("hardhat");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const V8tokenAddress = "0x0236d3BfA37bE80Ba34Bc47e3e226EcC118B45dD";
  const secondsPerToken = 1000;

  const LPDiscovery = await hre.ethers.deployContract("LPDiscovery", [
    V8tokenAddress,
    secondsPerToken,
  ]);

  await LPDiscovery.waitForDeployment();

  console.log(`LPDiscovery deployed to: ${LPDiscovery.target}`);

  await sleep(30000);

  await hre.run("verify:verify", {
    address: LPDiscovery.target,
    constructorArguments: [
      V8tokenAddress,
      secondsPerToken,
    ],
    contract: "contracts/discovery.sol:LPDiscovery",
  });

  console.log("Contract verified successfully!");
}

main().catch((error) => {
  console.error("Error deploying and verifying contract:", error);
  process.exitCode = 1;
});
