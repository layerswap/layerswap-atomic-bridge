// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {

  const SimpleMessenger = await hre.ethers.deployContract("SimpleMessenger",[]);

  await SimpleMessenger.waitForDeployment();

  console.log(`SimpleMessenger deployed to ${SimpleMessenger.target}`);

  await sleep(30000);

  await hre.run("verify:verify", {
    address: SimpleMessenger.target,
    constructorArguments: [],
    contract: "contracts/MessengerContract.sol:SimpleMessenger"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
