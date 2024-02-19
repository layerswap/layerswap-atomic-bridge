import 'dotenv/config';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import ECPairFactory from 'ecpair';
import { BitcoinHtlc } from '../../../packages/bitcoin/src/BitcoinHtlc';
import { BITCOIN } from './config';

async function lock() {
  const ECPair = ECPairFactory(ecc);
  const { WIF } = BITCOIN;

  const Alice = ECPair.fromWIF(WIF.FROM, bitcoin.networks.testnet);
  const Bob = ECPair.fromWIF(WIF.TO, bitcoin.networks.testnet);

  const swap = new BitcoinHtlc(bitcoin.networks.testnet);

  const hashPair = swap.createHashPair();
  console.log('hashPair', hashPair);

  const lock = await swap.lock(Alice, Bob, hashPair.secret, 7000, { fee: 1800, lockHeight: 2 });
  console.log(lock);
}
async function start() {
  await lock();
}

start();
