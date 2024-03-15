import Web3 from 'web3';
import crypto from 'crypto';
import { AbiItem } from 'web3-utils';
import { Contract } from 'web3-eth-contract';
import { HashPair } from './Core';

/**
 * HTLC operations on the Ethereum Test Net.
 * Passing a value to the constructor will overwrite the specified value.
 */
export class BaseHTLCService {
  public readonly web3: Web3;
  protected readonly contract: Contract;

  protected constructor(providerEndpoint: string, contractAddress: string, abi: AbiItem) {
    this.web3 = new Web3(new Web3.providers.HttpProvider(providerEndpoint));
    this.contract = new this.web3.eth.Contract(abi, contractAddress);
  }

  /**
   * create a new hash pair
   * If you specify an existing secret or proof in the constructor, take over that value
   */
  public createHashPair(): HashPair {
    const s = crypto.randomBytes(32);
    const p1 = crypto.createHash('sha256').update(s).digest();
    const p2 = crypto.createHash('sha256').update(p1).digest();
    return {
      proof: '0x' + s.toString('hex'),
      secret: '0x' + p2.toString('hex'),
    };
  }

  /**
   * Obtain contract information for the current instance
   */
  public getContractInfo(contractId: string) {
    return this.contract.methods.getHTLCDetails(contractId).call();
  }

  /**
   * Called by the sender if there was no withdraw AND the time lock has
   * expired. This will refund the contract amount.
   */
  public refund(contractId: string, senderAddress: string, gasLimit?: number) {
    const gas = gasLimit ?? 1000000;
    return this.contract.methods.refund(contractId).send({ from: senderAddress, gas: gas.toString() });
  }

  /**
   * Estimates the gas required for any contract method
   */
  public async estimateGas(
    options: { from: string; value?: any; gasPrice?: string | number; gas?: number },
    methodName: string,
    ...args: any[]
  ): Promise<any> {
    try {
      const method = this.contract.methods[methodName];

      if (!method) {
        throw new Error(`Method ${methodName} does not exist on the contract.`);
      }

      const estimatedGas = await method(...args).estimateGas(options);

      console.log('estimatedGas', estimatedGas);

      return estimatedGas;
    } catch (error) {
      console.error(`Error estimating gas for ${methodName}:`, error);
      throw error;
    }
  }
}
