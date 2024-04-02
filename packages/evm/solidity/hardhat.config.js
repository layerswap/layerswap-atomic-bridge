require('dotenv').config();

require('@nomicfoundation/hardhat-toolbox');

task('accounts', 'Prints the list of accounts', async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bscMain: {
      url: process.env.BSC_TESTNET_RPC_URL || 'https://bsc-dataseed.binance.org/',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 56,
      gas: 2000000,
      gasPrice: 10000000000, // 10 gwei
      timeout: 1000000,
    },
    fastex: {
      url: process.env.FASTEX_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    oasis: {
      url: process.env.OASIS_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    bahamut: {
      url: process.env.BAHAMUT_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    konsta: {
      url: process.env.KONSTA_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    arbitrum: {
      url: process.env.ARBITRUM_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    mumbai: {
      url: process.env.MUMBAI_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_URL || '',
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: 'USD',
  },
  // etherscan: {
  //   apiKey: process.env.MUMBAI_API_KEY,
  // },
  // etherscan: {
  //   apiKey: process.env.ARBITRUM_API_KEY,
  // },
  // etherscan: {
  //   apiKey: process.env.BSC_API_KEY,
  // },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  customChains: [
    {
      network: 'fastex',
      chainId: 424242,
      urls: {
        apiURL: process.env.FASTEX_URL || '',
      },
    },
    {
      network: 'oasis',
      chainId: 4090,
      urls: {
        apiURL: process.env.OASIS_URL || '',
      },
    },
    {
      network: 'bahamut',
      chainId: 5165,
      urls: {
        apiURL: process.env.BAHAMUT_URL || '',
      },
    },
  ],
};
