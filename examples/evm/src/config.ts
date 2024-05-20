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

export const OPTIMISM_RPC_ENDPOINT = 'https://optimism-sepolia.infura.io/v3/e37c38b359d644da93d6e1234a75b49a';
export const OPTIMISM_WSS_ENDPOINT = 'wss://optimism-sepolia.infura.io/ws/v3/e37c38b359d644da93d6e1234a75b49a';
export const ARBITRUM_RPC_ENDPOINT = 'https://arbitrum-sepolia.infura.io/v3/e37c38b359d644da93d6e1234a75b49a';
export const ARBITRUM_WSS_ENDPOINT = 'wss://arbitrum-sepolia.infura.io/ws/v3/e37c38b359d644da93d6e1234a75b49a';

export const OPTIMISM_MESSANGER_ADDRESS = '0xAeacd4B823cf06a8d0CfF8dEbb57629e76fD4C4f';
export const ARBITRUM_MESSANGER_ADDRESS = '0x2ad3140D1DB7569abD131CF0E84B44f488D9eE86';

export const ARB_HTLC_CONTRACT_ADDRESS = '0x8ea60e921af02f086dc77f8e508a850d9918ecc3';
export const OP_HTLC_CONTRACT_ADDRESS = '0x2ad3140D1DB7569abD131CF0E84B44f488D9eE86';
