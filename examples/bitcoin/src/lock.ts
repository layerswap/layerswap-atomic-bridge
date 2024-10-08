import 'dotenv/config';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import { BitcoinHtlc } from '@layerswap/bitcoin';
import { BITCOIN } from './config';

const NETWORK = bitcoin.networks.testnet;
const FEE = 1800;
const ECPair = ECPairFactory(ecc);
const { KEYS, TRANSACTION_DEFAULTS } = BITCOIN;

async function lock(hashlock: string) {
  const Alice = ECPair.fromWIF(KEYS.FROM_WIF, NETWORK);
  const Bob = ECPair.fromWIF(KEYS.TO_WIF, NETWORK);

  const htlc = new BitcoinHtlc(NETWORK);

  try {
    const lock = await htlc.lock(Alice, Bob, hashlock, TRANSACTION_DEFAULTS.AMOUNT, {
      fee: FEE,
      lockHeight: TRANSACTION_DEFAULTS.LOCK_HEIGHT,
    });
    console.log('Data:', lock);
  } catch (error) {
    console.error('Failed to lock funds:', error);
  }
}

async function start() {
  const hashlock = '**********';
  await lock(hashlock);
}

start();
