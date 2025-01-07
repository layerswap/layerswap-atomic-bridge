const hre = require("hardhat");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const V8tokenAddress = "0x0236d3BfA37bE80Ba34Bc47e3e226EcC118B45dD";
  const secondsPerToken = 1000;

  const SolverDiscovery = await hre.ethers.deployContract("SolverDiscovery", [
    V8tokenAddress,
    secondsPerToken,
  ]);

  await SolverDiscovery.waitForDeployment();

  console.log(`SolverDiscovery deployed to: ${SolverDiscovery.target}`);

  await sleep(30000);

  await hre.run("verify:verify", {
    address: SolverDiscovery.target,
    constructorArguments: [
      V8tokenAddress,
      secondsPerToken,
    ],
    contract: "contracts/discovery.sol:SolverDiscovery",
  });

  console.log("Contract verified successfully!");
}

main().catch((error) => {
  console.error("Error deploying and verifying contract:", error);
  process.exitCode = 1;
});
