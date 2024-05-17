interface TransactionResult {
  blockHash: string;
  blockNumber: number;
  contractAddress: string | null;
  cumulativeGasUsed: number;
  effectiveGasPrice: number;
  from: string;
  gasUsed: number;
  logsBloom: string;
  status: boolean;
  to: string;
  transactionHash: string;
  transactionIndex: number;
  type: string;
}

interface BaseEvent {
  address: string;
  blockHash: string;
  blockNumber: number;
  logIndex: number;
  removed: boolean;
  transactionHash: string;
  transactionIndex: number;
  id: string;
  event: string;
  signature: string;
  raw: Record<string, unknown>;
}

interface EtherTransferInitiatedReturnValues {
  contractId: string;
  hashlock: string;
  amount: string;
  chainID: string;
  timelock: string;
  sender: string;
  receiver: string;
  targetCurrencyReceiverAddress: string;
}

interface EtherHtlcInitiatedReturnValues {
  hashlock: string;
  amount: string;
  chainID: string;
  timelock: string;
  sender: string;
  srcAddress: string;
  targetCurrencyReceiverAddress: string;
  phtlcID: string;
}

interface EtherTransferClaimedReturnValues {
  contractId: string;
}

interface EtherTransferPreClaimedReturnValues {
  htlcId: string;
  redeemAddress: string;
}

interface TokenTransferInitiatedReturnValues {
  contractId: string;
  hashlock: string;
  amount: string;
  chainID: string;
  timelock: string;
  sender: string;
  receiver: string;
  tokenContract: string;
  targetCurrencyReceiverAddress: string;
}

interface TokenTransferClaimedReturnValues {
  contractId: string;
}

interface EtherTransferPreInitiatedReturnValues {
  phtlcID: string;
  dstChainId: string;
  dstAssetId: string;
  dstAddress: string;
  srcAssetId: string;
  srcAddress: string;
  timelock: string;
  messenger: string;
  amount: string;
  refunded: boolean;
  converted: boolean;
}

export interface EtherTransferInitiatedResult extends TransactionResult {
  events: {
    EtherTransferInitiated: BaseEvent & { returnValues: EtherTransferInitiatedReturnValues };
  };
}

export interface EtherHtlcInitiatedResult extends TransactionResult {
  l1Fee: string;
  events: {
    EtherTransferInitiated: BaseEvent & { returnValues: EtherHtlcInitiatedReturnValues };
  };
}

export interface EtherTransferClaimedResult extends TransactionResult {
  events: {
    EtherTransferClaimed: BaseEvent & { returnValues: EtherTransferClaimedReturnValues };
  };
}

export interface EtherTransferPreClaimedResult extends TransactionResult {
  l1Fee: string;
  events: {
    EtherTransferClaimed: BaseEvent & { returnValues: EtherTransferPreClaimedReturnValues };
  };
}

export interface TokenTransferInitiatedResult extends TransactionResult {
  events: {
    TokenTransferInitiated: BaseEvent & { returnValues: TokenTransferInitiatedReturnValues };
  };
}

export interface TokenTransferClaimedResult extends TransactionResult {
  events: {
    TokenTransferClaimed: BaseEvent & { returnValues: TokenTransferClaimedReturnValues };
  };
}

export interface EtherTransferPreInitiatedResult extends TransactionResult {
  events: {
    EtherTransferPreInitiated: BaseEvent & { returnValues: EtherTransferPreInitiatedReturnValues };
  };
}
