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
  TOKEN: {
    ALICE: '0x396810E66B06686A4A10d50b13BA9056b3f73372',
  },
};
