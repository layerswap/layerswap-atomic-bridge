import 'dotenv/config';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import { BitcoinHtlc } from '../../../packages/bitcoin/src/BitcoinHtlc';
import { BITCOIN } from './config';

const NETWORK = bitcoin.networks.testnet;
const ECPair = ECPairFactory(ecc);
const { KEYS } = BITCOIN;

async function refund(hash: string, contractAddress: string, witnessScript: string) {
  const Alice = ECPair.fromWIF(KEYS.FROM_WIF, NETWORK);
  const swap = new BitcoinHtlc(NETWORK);

  try {
    const txHash = await swap.refund(hash, contractAddress, witnessScript, Alice);
    console.log(`Refund successful. Transaction Hash: ${txHash}`);
  } catch (error) {
    console.error('Refund failed:', error.message);
  }
}

async function start() {
  const hash = '<hash_value>';
  const contractAddress = '<contract_address>';
  const witnessScript = '<witness_script>';

  await refund(hash, contractAddress, witnessScript);
}

start();
