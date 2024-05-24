require('dotenv').config();

export const ETH = {
  PRIVATE_KEYS: {
    FROM: process.env.FROM_PRIVATE_KEY as string,
    TO: process.env.TO_PRIVATE_KEY as string,
  },
  NETWORK: {
    TEST: {
      sepolia: {
        native: {
          endpoint: 'https://sepolia.infura.io/v3/85eb73cb20fc46058b5044657ed33efd',
          contractAddress: '',
        },
        erc20: {
          endpoint: 'https://sepolia.infura.io/v3/85eb73cb20fc46058b5044657ed33efd',
          contractAddress: '',
        },
      },
    },
  },
  ERC20_TOKEN_ADDRESS: '',
};

export const CONFIRMATION_THRESHOLD = 12;

export const USER_TIMELOCK_SECONDS = 3600;
export const USER_ADDRESS = '';
export const USER_PRIVATE_KEY = '';

export const LP_ADDRESS = '';
export const LP_PRIVATE_KEY = '';

export const LP2_ADDRESS = '';
export const LP2_PRIVATE_KEY = '';

export const OPTIMISM_RPC_ENDPOINT = 'https://optimism-mainnet.infura.io/v3/e37c38b359d644da93d6e1234a75b49a';
export const OPTIMISM_WSS_ENDPOINT = 'wss://optimism-mainnet.infura.io/ws/v3/e37c38b359d644da93d6e1234a75b49a';
export const ARBITRUM_RPC_ENDPOINT = 'https://arbitrum-mainnet.infura.io/v3/e37c38b359d644da93d6e1234a75b49a';
export const ARBITRUM_WSS_ENDPOINT = 'wss://arbitrum-mainnet.infura.io/ws/v3/e37c38b359d644da93d6e1234a75b49a';
export const LINEA_RPC_ENDPOINT = 'https://linea-mainnet.infura.io/v3/e37c38b359d644da93d6e1234a75b49a';
export const LINEA_WSS_ENDPOINT = 'wss://linea-mainnet.infura.io/ws/v3/e37c38b359d644da93d6e1234a75b49a';

export const OPTIMISM_MESSANGER_ADDRESS = '0xCf0E1f30A04Bc616A90d3d45EAD18DD33065F1c5';
export const ARBITRUM_MESSANGER_ADDRESS = '0x41eC57a505fedAa45840852CAd481B0Cab72881a';
export const LINEA_MESSANGER_ADDRESS = '0xCf0E1f30A04Bc616A90d3d45EAD18DD33065F1c5';

export const ARB_HTLC_CONTRACT_ADDRESS = '0xF6982803D201F259f02e0D664c039097daf78122';
export const OP_HTLC_CONTRACT_ADDRESS = '0x7327EF11C037BfbDe721e39C4879E308E1570acc';
export const LINEA_HTLC_CONTRACT_ADDRESS = '0x7327EF11C037BfbDe721e39C4879E308E1570acc';
