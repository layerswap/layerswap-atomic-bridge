import { AbiItem } from 'web3-utils';
import ERC20Abi from './abi/ERC20.json';
import HashedTimelockERC20 from './abi/HashedTimelockERC20.json';
import { BaseHTLCService } from './models/BaseHtlc';
import { LockOptions } from './models/Core';
import { HTLCERC20MintResult, HTLCERC20WithdrawResult } from './models/Contract';

/**
 * HTLC operations on the Ethereum Test Net.
 * Passing a value to the constructor will overwrite the specified value.
 */
export class EvmErc20Htlc extends BaseHTLCService {
  private readonly contractAddress: string;

  constructor(providerEndpoint: string, contractAddress: string) {
    super(providerEndpoint, contractAddress, HashedTimelockERC20.abi as unknown as AbiItem);
    this.contractAddress = contractAddress;
  }

  /**
   * Issue HTLC and obtain the key at the time of issue
   */
  public async lock(
    recipientAddress: string,
    senderAddress: string,
    secret: string,
    amount: number,
    tokenAddress: string,
    options?: LockOptions
  ): Promise<HTLCERC20MintResult> {
    // Pre-register before issuing a transaction
    const erc20TokenContract = new this.web3.eth.Contract(ERC20Abi.abi as any, tokenAddress);
    const gas = options?.gasLimit ?? 1000000;
    const value = this.web3.utils.toWei(this.web3.utils.toBN(amount), 'finney');
    await erc20TokenContract.methods
      .approve(this.contractAddress, value)
      .send({ from: senderAddress, gas: gas.toString() });
    // Issue lock transaction
    const lockPeriod = Math.floor(Date.now() / 1000) + (options?.lockSeconds ?? 3600);
    return await this.contract.methods
      .createHTLC(recipientAddress, secret, lockPeriod, tokenAddress, value)
      .send({ from: senderAddress, gas: gas.toString() });
  }

  /**
   * Receive tokens stored under the key at the time of HTLC generation
   */
  public async withdraw(contractId: string, senderAddress: string, proof: string, gasLimit?: number) {
    const gas = gasLimit ?? 1000000;
    const res = await this.contract.methods
      .redeem(contractId, proof)
      .send({ from: senderAddress, gas: gas.toString() });
    return { result: res as HTLCERC20WithdrawResult };
  }
}
