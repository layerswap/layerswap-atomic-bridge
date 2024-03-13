export const BITCOIN = {
  KEYS: {
    FROM_WIF: process.env.FROM_WIF as string,
    TO_WIF: process.env.TO_WIF as string,
  },
  TRANSACTION_DEFAULTS: {
    AMOUNT: parseInt(process.env.AMOUNT || '5000', 10),
    LOCK_HEIGHT: parseInt(process.env.LOCK_HEIGHT || '2', 10),
    OP_RETURN_DATA: process.env.OP_RETURN_DATA as string,
  },
};
