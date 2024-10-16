// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require('hardhat');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const LayerswapV8 = await hre.ethers.deployContract('LayerswapV8', []);

  await LayerswapV8.waitForDeployment();

  console.log(`LayerswapV8 deployed to ${LayerswapV8.target}`);

  await sleep(30000);

  await hre.run('verify:verify', {
    address: LayerswapV8.target,
    constructorArguments: [],
    contract: 'contracts/HashedTimeLockEther.sol:LayerswapV8',
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
