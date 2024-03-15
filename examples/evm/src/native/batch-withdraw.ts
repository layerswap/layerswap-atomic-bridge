import 'dotenv/config';
import { ETH } from '../config';
import { EvmHtlc } from '@layerswap/evm';

async function batchWithdrawContracts() {
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmHtlc(NETWORK.TEST.sepolia.native.endpoint, NETWORK.TEST.sepolia.native.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const senderAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;

  const contractIds = ['0x0', '0x0']; // Replace with actual contract IDs
  const secrets = ['0x0', '0x0']; // Replace with actual secrets

  try {
    const res = await client.batchWithdraw(senderAddress, contractIds, secrets);
    console.log('Batch withdraw successful:', JSON.stringify(res, null, 2));
  } catch (error) {
    console.error('Error during batch withdraw:', error);
  }
}

batchWithdrawContracts();
