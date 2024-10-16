// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {

  const TestToken = await hre.ethers.deployContract("TestToken");

  await TestToken.waitForDeployment();

  console.log(`TestToken deployed to ${TestToken.target}`);

  await sleep(25000);

  await hre.run("verify:verify", {
    address: TestToken.target,
    constructorArguments: [],
    contract: "contracts/TestToken.sol:TestToken"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
