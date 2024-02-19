import 'dotenv/config';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import { BitcoinHtlc } from '../../../packages/bitcoin/src/BitcoinHtlc';
import { BITCOIN } from './config';

async function withDraw(hash: string, contractAddress: string, witnessScript: string, proof: string) {
  const { WIF } = BITCOIN;
  const ECPair = ECPairFactory(ecc);
  const Bob = ECPair.fromWIF(WIF.TO, bitcoin.networks.testnet);
  const swap = new BitcoinHtlc(bitcoin.networks.testnet);
  return await swap.withdraw(hash, contractAddress, witnessScript, Bob, proof);
}

async function start() {
  const hash = '3d399c85be92fd6eaff41ad9b949f9124ef74f05d74b3381e5a45ef36c626708';
  const contractAddress = 'tb1q34ssflnersnj8llrnah6akef68wqjjyggmv7rm5msx5z266vkpjs463mc9';
  const witnessScript =
    'aa20f283d11344d76c38e913083826157ca3f3384da18533baafde3a5e23bfa1d80e87632102f478309f47b4b8922078a1be0d72e01976d07b726cebd8059f99d82524f643f96703ea5827b1752103d39c69d206ab3d0212f996e1168016781205acf2d3c2c7cd333262d167763b3f68ac';
  const proof = '435a2b082172e2e32614b24afabf796fc485dea691631ac1648f4b8dbf0a28d6';
  await withDraw(hash, contractAddress, witnessScript, proof);
}

start();
