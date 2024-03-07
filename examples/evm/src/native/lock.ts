import 'dotenv/config';
import { ETH } from '../config';
import { EvmHtlc } from '@layerswap/evm';

async function lock(hashlock: string) {
  // setup
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmHtlc(NETWORK.TEST.sepolia.native.endpoint, NETWORK.TEST.sepolia.native.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const fromAddress = AccountService.wallet.add(PRIVATE_KEYS.FROM).address;
  const toAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;
  // lock
  const result = await client.lock(toAddress, fromAddress, hashlock, 1);
  console.log('----- Lock transaction enlistment completed -----', {
    fromAddress: fromAddress,
    toAddress: toAddress,
    contractId: result.events.HTLCEtherCreated.returnValues.contractId,
    transactionHash: result.transactionHash,
    secret: hashlock,
    contractInfo: await client.getContractInfo(result.events.HTLCEtherCreated.returnValues.contractId),
  });
}

async function start() {
  const hashlock = '';
  await lock(hashlock);
}

start();
