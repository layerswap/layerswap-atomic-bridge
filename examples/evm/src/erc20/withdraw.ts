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
    `----- Start withdraws https://sepolia.etherscan.io/tx/${res.transactionHash} -----`,
    await client.getContractInfo(res.events.TokenTransferClaimed.returnValues.contractId)
  );
}

async function start() {
  const contractId = ''; // Replace with the contract ID
  const proof = ''; // Replace with the proof
  await withdraw(contractId, proof);
}

start();
