import 'dotenv/config';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import { BitcoinHtlc } from '../../../packages/bitcoin/src/BitcoinHtlc';
import { BITCOIN } from './config';

const NETWORK = bitcoin.networks.testnet;
const ECPair = ECPairFactory(ecc);
const { KEYS } = BITCOIN;

async function withdraw(hash: string, contractAddress: string, witnessScript: string, proof: string) {
  const Bob = ECPair.fromWIF(KEYS.TO_WIF, NETWORK);
  const swap = new BitcoinHtlc(NETWORK);

  try {
    const txHash = await swap.withdraw(hash, contractAddress, witnessScript, Bob, proof);
    console.log(`Transaction successful with hash: ${txHash}`);
  } catch (error) {
    console.error('Withdrawal failed:', error);
  }
}

async function start() {
  const hash = '<hash_value>';
  const contractAddress = '<contract_address>';
  const witnessScript = '<witness_script>';
  const proof = '<proof_value>';

  await withdraw(hash, contractAddress, witnessScript, proof);
}

start();
