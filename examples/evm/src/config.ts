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
