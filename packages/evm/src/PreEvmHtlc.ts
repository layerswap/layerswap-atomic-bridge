import { AbiItem } from 'web3-utils';
import PreHashedTimeLockEther from './abi/PreHashedTimeLockEther.json';
import { BaseHTLCService } from './models/BaseHtlc';
import { PartialSendOptions, SendOptions } from './models/Core';
import { AssetID, ChainID } from './config/enums';
import {
  EtherHtlcInitiatedResult,
  EtherTransferPreClaimedResult,
  EtherTransferPreInitiatedResult,
} from './models/Contract';

export class PreEvmHtlc extends BaseHTLCService {
  constructor(providerEndpoint: string, contractAddress: string) {
    super(providerEndpoint, contractAddress, PreHashedTimeLockEther as unknown as AbiItem);
  }

  async createPre(
    chainIds: ChainID[],
    dstAddresses: string[],
    dstChainId: ChainID,
    dstAssetId: AssetID,
    dstAddress: string,
    srcAssetId: AssetID,
    srcAddress: string,
    timelock: number,
    messenger: string,
    options: SendOptions
  ): Promise<EtherTransferPreInitiatedResult> {
    const { gasLimit, senderAddress, amount } = options;
    const value = this.web3.utils.toWei(this.web3.utils.toBN(amount), 'finney');

    const estimatedGas =
      gasLimit ??
      Math.floor(
        (await this.estimateGas(
          { from: senderAddress, value },
          'createP',
          chainIds,
          dstAddresses,
          dstChainId,
          dstAssetId,
          dstAddress,
          srcAssetId,
          srcAddress,
          timelock,
          messenger
        )) * 1.2
      );

    return this.contract.methods
      .createP(chainIds, dstAddresses, dstChainId, dstAssetId, dstAddress, srcAssetId, srcAddress, timelock, messenger)
      .send({ from: senderAddress, gas: estimatedGas.toString(), value });
  }

  public async createHtlc(
    srcAddress: string,
    hashlock: string,
    timelock: number,
    chainId: ChainID,
    receiverChainAddress: string,
    phtlcID: string,
    messenger: string,
    options: SendOptions
  ): Promise<EtherHtlcInitiatedResult> {
    const { gasLimit, senderAddress, amount: value } = options;

    const estimatedGas =
      gasLimit ??
      Math.floor(
        (await this.estimateGas(
          { from: senderAddress, value },
          'create',
          srcAddress,
          hashlock,
          timelock,
          chainId,
          receiverChainAddress,
          phtlcID,
          messenger
        )) * 1.2
      );

    return await this.contract.methods
      .create(srcAddress, hashlock, timelock, chainId, receiverChainAddress, phtlcID, messenger)
      .send({ from: senderAddress, gas: estimatedGas.toString(), value });
  }

  public async convertP(
    phtlcID: string,
    hashlock: string,
    options: PartialSendOptions
  ): Promise<EtherHtlcInitiatedResult> {
    const { gasLimit, senderAddress } = options;

    const estimatedGas =
      gasLimit ?? Math.floor((await this.estimateGas({ from: senderAddress }, 'convertP', phtlcID, hashlock)) * 1.2);

    return this.contract.methods
      .convertP(phtlcID, hashlock)
      .send({ from: senderAddress, gas: estimatedGas.toString() });
  }

  public async redeem(
    hashlock: string,
    proof: string,
    options: PartialSendOptions
  ): Promise<EtherTransferPreClaimedResult> {
    const { gasLimit, senderAddress } = options;

    const estimatedGas =
      gasLimit ?? Math.floor((await this.estimateGas({ from: senderAddress }, 'redeem', hashlock, proof)) * 1.2);

    return this.contract.methods.redeem(hashlock, proof).send({ from: senderAddress, gas: estimatedGas.toString() });
  }
}
