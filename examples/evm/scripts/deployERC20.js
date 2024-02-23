// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {

  // const cre = "0x854D71776C48155c712502DA3f212A6C2a914375"; test spo
  //const cre = "0x21B8bfbbefc9E2b9A994871Ecd742A5132B98AeD"; // main net
  const HashedTimelockERC20 = await hre.ethers.deployContract("HashedTimelockERC20",[]);

  await HashedTimelockERC20.waitForDeployment();

  console.log(`HashedTimelockERC20 deployed to ${HashedTimelockERC20.target}`);

  await sleep(30000);

  await hre.run("verify:verify", {
    address: HashedTimelockERC20.target,
    constructorArguments: [],
    contract: "contracts/HashedTimelockERC20.sol:HashedTimelockERC20"
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
