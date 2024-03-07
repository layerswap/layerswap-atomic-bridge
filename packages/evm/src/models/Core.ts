export interface LockOptions {
  gasLimit?: number;
  lockSeconds?: number;
}

export interface HashPair {
  secret: string;
  proof: string;
}
