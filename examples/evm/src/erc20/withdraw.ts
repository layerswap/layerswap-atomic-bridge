import 'dotenv/config';
import { ETH } from '../config';
import { EvmErc20Htlc } from '@layerswap/evm';

async function withdraw(contractId: string, proof: string) {
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmErc20Htlc(NETWORK.TEST.sepolia.erc20.endpoint, NETWORK.TEST.sepolia.erc20.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const toAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;
  const res = await client.withdraw(contractId, toAddress, proof);
  console.log(
    `----- Start withdraws https://sepolia.etherscan.io/tx/${res.result.transactionHash} -----`,
    await client.getContractInfo(res.result.events.HTLCERC20Withdraw.returnValues.contractId)
  );
}

async function start() {
  const contractId = '************************';
  const proof = '************************';
  await withdraw(contractId, proof);
}

start();
