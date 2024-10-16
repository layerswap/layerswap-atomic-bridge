export interface LockOptions {
  fee?: number;
  lockHeight?: number;
  data?: string;
}

export interface HashPair {
  secret: string;
  proof: string;
}

export interface Utxo {
  hash: string;
  index: number;
  value: number;
}
