import { AbiItem } from 'web3-utils';
import PreHashedTimeLockEther from './abi/PreHashedTimeLockEther.json';

export const PreHashedTimeLockEtherABI = PreHashedTimeLockEther as unknown as AbiItem;

export * from './config/enums';

export * from './PreEvmHtlc';
export * from './EvmHtlc';
export * from './EvmErc20Htlc';
