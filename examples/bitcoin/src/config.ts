export const BITCOIN = {
  KEYS: {
    FROM_WIF: process.env.FROM_WIF as string,
    TO_WIF: process.env.TO_WIF as string,
    PLATFORM_WIF: process.env.PLATFORM_WIF as string,
  },
  TRANSACTION_DEFAULTS: {
    AMOUNT: parseInt(process.env.AMOUNT || '5000', 10),
    LOCK_HEIGHT: parseInt(process.env.LOCK_HEIGHT || '2', 10),
  },
};
