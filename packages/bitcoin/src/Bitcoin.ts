import axios from 'axios';
import mempoolJS from '@mempool/mempool.js';
import varuint from 'varuint-bitcoin';
import { MempoolReturn } from '@mempool/mempool.js/lib/interfaces/index';
import { crypto, networks, Psbt, payments, script } from 'bitcoinjs-lib';
import { randomBytes, createHash } from 'crypto';
import { HashPair, Utxo } from './Core';
import ECPairFactory, { ECPairInterface } from 'ecpair';
import * as ecc from 'tiny-secp256k1';

/**
 * bitcoin 系のコインのインターフェース
 */
export default abstract class Bitcoin {
  readonly mempool: MempoolReturn['bitcoin'];
  readonly network: networks.Network;
  readonly baseUrl: string;

  constructor(network: networks.Network) {
    this.network = network;
    const networkStr = network === networks.bitcoin ? 'bitcoin' : 'testnet';
    this.mempool = mempoolJS({
      hostname: 'mempool.space',
      network: networkStr,
    }).bitcoin;
    this.baseUrl = `https://mempool.space/${networkStr}`;
  }

  public createHashPair(): HashPair {
    const s = randomBytes(32);
    const p1 = createHash('sha256').update(s).digest();
    const p2 = createHash('sha256').update(p1).digest();
    return {
      proof: s.toString('hex'),
      secret: p2.toString('hex'),
    };
  }

  protected async getCurrentBlockHeight(): Promise<number> {
    return await this.mempool.blocks.getBlocksTipHeight();
  }

  protected async postTransaction(txhex: string): Promise<any> {
    const endpoint = `${this.baseUrl}/api/tx`;
    return new Promise((resolve, reject) => {
      axios
        .post(endpoint, txhex)
        .then((res) => {
          resolve(res.data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  protected async getInputData(txid: string, contractAddress: string): Promise<{ value: number; index: number }> {
    const txInfo = await this.mempool.transactions.getTx({ txid });
    let value = 0;
    let index = 0;
    for (let i = 0; i < txInfo.vout.length; i++) {
      if (txInfo.vout[i].scriptpubkey_address == contractAddress) {
        value = txInfo.vout[i].value;
        index = i;
      }
    }
    return { value, index };
  }

  protected async getUtxos(address: string): Promise<{ hash: string; index: number; value: number }[]> {
    const utxosData = await this.mempool.addresses.getAddressTxsUtxo({
      address,
    });
    const utxos: { hash: string; index: number; value: number }[] = [];
    for (let i = 0; i < utxosData.length; i++) {
      const hash = utxosData[i].txid;
      const index = utxosData[i].vout;
      const value = utxosData[i].value;
      utxos.push({
        hash,
        index,
        value,
      });
    }
    return utxos;
  }

  protected buildAndSignTx(
    sender: ECPairInterface,
    address: string,
    recipient: string,
    sendingSat: number,
    feeSat: number,
    utxos: Utxo[],
    opReturnData?: string
  ): string {
    const psbt = new Psbt({ network: this.network });
    let total = 0;
    const pubKeyHash = crypto.hash160(sender.publicKey).toString('hex');
    for (let len = utxos.length, i = 0; i < len; i++) {
      psbt.addInput({
        hash: utxos[i].hash,
        index: utxos[i].index,
        witnessUtxo: {
          script: Buffer.from('0014' + pubKeyHash, 'hex'),
          value: utxos[i].value,
        },
      });
      total += utxos[i].value;
    }

    psbt.addOutput({
      address: recipient,
      value: sendingSat,
    });

    if (opReturnData) {
      psbt.addOutput(this.createOpReturnOutput(opReturnData));
    }

    const changeSat = total - sendingSat - feeSat;
    if (changeSat < 0) {
      throw new Error(`Balance is insufficient. Balance (UTXO Total): ${total} satoshi`);
    }

    psbt.addOutput({
      address: address,
      value: changeSat,
    });

    for (let len = utxos.length, i = 0; i < len; i++) {
      psbt.signInput(i, sender);
      psbt.validateSignaturesOfInput(i, (pubkey, msghash, signature) => {
        return ECPairFactory(ecc).fromPublicKey(pubkey).verify(msghash, signature);
      });
    }

    psbt.finalizeAllInputs();
    return psbt.extractTransaction().toHex();
  }

  protected witnessStackToScriptWitness(witness: any): Buffer {
    let buffer = Buffer.allocUnsafe(0);
    function writeSlice(slice: any) {
      buffer = Buffer.concat([buffer, Buffer.from(slice)]);
    }

    function writeVarInt(i: any) {
      const currentLen = buffer.length;
      const varintLen = varuint.encodingLength(i);

      buffer = Buffer.concat([buffer, Buffer.allocUnsafe(varintLen)]);
      varuint.encode(i, buffer, currentLen);
    }

    function writeVarSlice(slice: any) {
      writeVarInt(slice.length);
      writeSlice(slice);
    }

    function writeVector(vector: any) {
      writeVarInt(vector.length);
      vector.forEach(writeVarSlice);
    }

    writeVector(witness);

    return buffer;
  }

  /**
   * Generate HTLC Contract Script for Bitcoin
   */
  protected generateSwapWitnessScript(
    receiverPublicKey: Buffer,
    userRefundPublicKey: Buffer,
    paymentHash: string,
    timelock: number
  ): Buffer {
    return script.fromASM(
      `
           OP_HASH256
           ${paymentHash}
           OP_EQUAL
           OP_IF
           ${receiverPublicKey.toString('hex')}
           OP_ELSE
           ${script.number.encode(timelock).toString('hex')}
           OP_CHECKLOCKTIMEVERIFY
           OP_DROP
           ${userRefundPublicKey.toString('hex')}
           OP_ENDIF
           OP_CHECKSIG
           `
        .trim()
        .replace(/\s+/g, ' ')
    );
  }

  protected createOpReturnOutput(data: string) {
    const opReturnBuffer = Buffer.from(data, 'utf8');

    if (opReturnBuffer.length > 80) {
      throw new Error('OP_RETURN data exceeds 80 bytes');
    }

    const opReturnOutput = payments.embed({ data: [opReturnBuffer] }).output;

    return {
      script: opReturnOutput!,
      // OP_RETURN outputs have a value of 0
      value: 0,
    };
  }
}
