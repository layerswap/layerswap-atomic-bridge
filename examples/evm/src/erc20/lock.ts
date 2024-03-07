import 'dotenv/config';
import { ETH } from '../config';
import { EvmErc20Htlc } from '@layerswap/evm';

async function lock() {
  // setup
  const { PRIVATE_KEYS, NETWORK, TOKEN } = ETH;
  const client = new EvmErc20Htlc(NETWORK.TEST.sepolia.erc20.endpoint, NETWORK.TEST.sepolia.erc20.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const fromAddress = AccountService.wallet.add(PRIVATE_KEYS.FROM).address;
  const toAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;
  const hashPair = client.createHashPair();
  // lock
  const result = await client.lock(toAddress, fromAddress, hashPair.secret, 1, TOKEN.ALICE);
  console.log('----- Lock transaction enlistment completed -----', {
    fromAddress: fromAddress,
    toAddress: toAddress,
    contractId: result.events.HTLCERC20Created.returnValues.contractId,
    transactionHash: result.transactionHash,
    proof: hashPair.proof,
    secret: hashPair.secret,
    contractInfo: await client.getContractInfo(result.events.HTLCERC20Created.returnValues.contractId),
  });
}

async function start() {
  await lock();
}

start();
