export interface LockOptions {
  fee?: number;
  lockHeight?: number;
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
