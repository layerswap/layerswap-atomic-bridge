require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
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
    kakarotSepolia: {
      url: 'https://sepolia-rpc.kakarot.org',
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
    },
    unichainSepolia: {
      url: 'https://sepolia.unichain.org',
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
    },
    arbitrumSepolia: {
      url: 'https://arbitrum-sepolia.drpc.org',
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
    },
    sepolia: {
      url: `https://sepolia.infura.io/v3/775081a490784e709d3457ed0e413b21`,
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
    },
    lineaSepolia: {
      url: "https://rpc.sepolia.linea.build",
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
      chainId: 59141,
    },
    optimismSepolia: {
      url: "https://sepolia.optimism.io",
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
      chainId: 11155420,
    },
    taikoHekla: {
      url: "https://rpc.hekla.taiko.xyz.",
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
      chainId: 167009,
    },
    immutableTestnet: {
      url: "https://rpc.testnet.immutable.com",
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
      chainId: 13473,
    },
    minato: {
      url: 'https://rpc.minato.soneium.org/',
      accounts: ['e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9'],
    },
  },
  etherscan: {
    apiKey: {
      unichainSepolia: "Q7JD6R5A6S8B3KXIZFS5NBP13MJI9C74YH",
      immutableTestnet: "pk_imapik-test-$JSr2xVyP--QDkeRDm@t",
      optimismSepolia: "UM3DM9U5BE55IYGI656ET7VWI5PZJEHIS3",
      lineaSepolia: "KRPGHKNVEKJVSA3NG8XGMAAS3ZQIZYFKNV",
      taikoHekla: "XTMX6XTKPD8VCWD58AEPEKYTQB6QW5W1T8",
      arbitrumSepolia: "J3J5B7TVWIDGV5236BHRGAUD9YJV5T33AH",
      sepolia: "Q7JD6R5A6S8B3KXIZFS5NBP13MJI9C74YH",
      kakarotSepolia: "kakarot_sepolia",
      minato: "empty",
      sepolia: "Q7JD6R5A6S8B3KXIZFS5NBP13MJI9C74YH"
    },
    customChains: [
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
        chainId: 1802203764_2,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/1802203764_2/etherscan",
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