import 'dotenv/config';
import { ETH } from '../config';
import { EvmHtlc } from '@layerswap/evm';

async function lock() {
  // setup
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmHtlc(NETWORK.TEST.sepolia.native.endpoint, NETWORK.TEST.sepolia.native.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const fromAddress = AccountService.wallet.add(PRIVATE_KEYS.FROM).address;
  const toAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;
  const hashPair = client.createHashPair();
  // lock
  const result = await client.lock(toAddress, fromAddress, hashPair.secret, 1);
  console.log('----- Lock transaction enlistment completed -----', {
    fromAddress: fromAddress,
    toAddress: toAddress,
    contractId: result.events.HTLCEtherCreated.returnValues.contractId,
    transactionHash: result.transactionHash,
    proof: hashPair.proof,
    secret: hashPair.secret,
    contractInfo: await client.getContractInfo(result.events.HTLCEtherCreated.returnValues.contractId),
  });
}

async function start() {
  await lock();
}

start();
