import { AbiItem } from 'web3-utils';
import HashedTimelockEther from './abi/HashedTimelockEther.json';
import { BaseHTLCService } from './models/BaseHtlc';
import { LockOptions } from './models/Core';
import { HTLCMintResult, HTLCWithdrawResult } from './models/Contract';

/**
 * HTLC operations on the Ethereum Test Net.
 * Passing a value to the constructor will overwrite the specified value.
 */
export class EvmHtlc extends BaseHTLCService {
  constructor(providerEndpoint: string, contractAddress: string) {
    super(providerEndpoint, contractAddress, HashedTimelockEther.abi as unknown as AbiItem);
  }

  /**
   * Issue HTLC and obtain the key at the time of issue
   */
  public async lock(
    recipientAddress: string,
    senderAddress: string,
    secret: string,
    amount: number,
    options?: LockOptions
  ): Promise<HTLCMintResult> {
    const value = this.web3.utils.toWei(this.web3.utils.toBN(amount), 'finney');
    const lockPeriod = Math.floor(Date.now() / 1000) + (options?.lockSeconds ?? 3600);
    const gas = options?.gasLimit ?? 1000000;
    return await this.contract.methods
      .createHTLC(recipientAddress, secret, lockPeriod)
      .send({ from: senderAddress, gas: gas.toString(), value });
  }

  /**
   * Receive tokens stored under the key at the time of HTLC generation
   */
  public async withdraw(contractId: string, senderAddress: string, proof: string, gasLimit?: number) {
    const gas = gasLimit ?? 1000000;
    const result = await this.contract.methods
      .redeem(contractId, proof)
      .send({ from: senderAddress, gas: gas.toString() });

    return { result: result as HTLCWithdrawResult };
  }
}
