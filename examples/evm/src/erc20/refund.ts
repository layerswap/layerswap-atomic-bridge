import 'dotenv/config';
import { ETH } from '../config';
import { EvmErc20Htlc } from '@layerswap/evm';

async function refund(contractId: string) {
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmErc20Htlc(NETWORK.TEST.sepolia.erc20.endpoint, NETWORK.TEST.sepolia.erc20.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const senderAddress = AccountService.wallet.add(PRIVATE_KEYS.FROM).address;

  try {
    const res = await client.refund(contractId, senderAddress);
    console.log('Refund result:', JSON.stringify(res, null, 2));
  } catch (error) {
    console.error('Error during refund:', error);
  }
}

refund(''); // Replace with actual contract ID
