import 'dotenv/config';
import { ETH } from '../config';
import { EvmHtlc } from '@layerswap/evm';

async function refund(contractId: string) {
  // setup
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmHtlc(NETWORK.TEST.sepolia.native.endpoint, NETWORK.TEST.sepolia.native.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const senderAddress = AccountService.wallet.add(PRIVATE_KEYS.FROM).address;
  // refund
  const result = await client.refund(contractId, senderAddress);
  console.log('----- Refund transaction enlistment completed -----', {
    fromAddress: senderAddress,
    contractId: result.events.HTLCEtherRefunded.returnValues.contractId,
    transactionHash: result.transactionHash,
    contractInfo: await client.getContractInfo(result.events.HTLCEtherRefunded.returnValues.contractId),
  });
}

async function start() {
  const contractId = '';
  await refund(contractId);
}

start();
