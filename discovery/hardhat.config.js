require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
        version: '0.8.23',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          viaIR: true
        },
      },
  networks: {
    berachain: {
      url: 'https://bartio.rpc.berachain.com/',
      accounts: [process.env.MNEMONIC],
    },
    kakarot_sepolia: {
      url: 'https://sepolia-rpc.kakarot.org',
      accounts: [process.env.MNEMONIC],
    },
    unichainSepolia: {
      url: 'https://sepolia.unichain.org',
      accounts: [process.env.MNEMONIC],
    },
    arbitrumSepolia: {
      url: 'https://arbitrum-sepolia.drpc.org',
      accounts: [process.env.MNEMONIC],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/775081a490784e709d3457ed0e413b21`,
      accounts: [process.env.MNEMONIC],
    },
    lineaSepolia: {
      url: "https://rpc.sepolia.linea.build",
      accounts: [process.env.MNEMONIC],
      chainId: 59141,
    },
    optimismSepolia: {
      url: "https://sepolia.optimism.io",
      accounts: [process.env.MNEMONIC],
      chainId: 11155420,
    },
    taikoHekla: {
      url: "https://rpc.hekla.taiko.xyz.",
      accounts: [process.env.MNEMONIC],
      chainId: 167009,
    },
    immutableTestnet: {
      url: "https://rpc.testnet.immutable.com",
      accounts: [process.env.MNEMONIC],
      chainId: 13473,
    },
    minato: {
      url: 'https://rpc.minato.soneium.org/',
      accounts: [process.env.MNEMONIC],
    },
  },
  etherscan: {
    apiKey: {
      berachain: process.env.berachain,
      unichainSepolia: process.env.unichainSepolia,
      immutableTestnet: process.env.immutableTestnet,
      optimismSepolia: process.env.optimismSepolia,
      lineaSepolia: process.env.lineaSepolia,
      taikoHekla: process.env.taikoHekla,
      arbitrumSepolia: process.env.arbitrumSepolia,
      minato: process.env.minato,
      sepolia: process.env.sepolia,
      kakarot_sepolia: process.env.kakarot_sepolia,
    },
    customChains: [
      {
        network: "berachain",
        chainId: 80084,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/80084/etherscan/api/",
          browserURL: "https://bartio.beratrail.io/",
        },
      },
      {
        network: "unicahinSepolia",
        chainId: 1301,
        urls: {
          apiURL: "https://sepolia.uniscan.xyz/api",
          browserURL: "	https://sepolia.uniscan.xyz/",
        },
      },
      {
        network: "lineaSepolia",
        chainId: 59141,
        urls: {
          apiURL: "https://api-sepolia.lineascan.build/api",
          browserURL: "https://sepolia.lineascan.build",
        },
      },
      {
        network: "optimismSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io/"
        },
      },
      {
        network: "taikoHekla",
        chainId: 167009,
        urls: {
          apiURL: "https://blockscoutapi.hekla.taiko.xyz/api",
          browserURL: "https://blockscoutapi.hekla.taiko.xyz/"
        },
      },
      {
        network: "immutableTestnet",
        chainId: 13473,
        urls: {
          apiURL: "https://explorer.testnet.immutable.com/api",
          browserURL: "https://explorer.testnet.immutable.com/"
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: 421614,
        urls: {
          apiURL: "https://api.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
       {
        network: "kakarot_sepolia",
        chainId: 920637907288165,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/920637907288165/etherscan",
          browserURL: "https://sepolia.kakarotscan.org"
        }
      },
      {
        network: "minato",
        chainId: 1946,
        urls: {
          apiURL: "https://explorer-testnet.soneium.org/api",
          browserURL: "https://explorer-testnet.soneium.org/",
        },
      },
    ]
  },
  sourcify: {
    enabled: false
  }
};