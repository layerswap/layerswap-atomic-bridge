export interface SendOptions {
  gasLimit?: number;
  gasPrice?: string;
  senderAddress: string;
  amount: number | string;
}

export interface PartialSendOptions extends Omit<SendOptions, 'amount'> {
  amount?: number | string;
}
export interface LockOptions {
  gasLimit?: number;
  lockSeconds?: number;
}

export interface HashPair {
  secret: string;
  proof: string;
}
