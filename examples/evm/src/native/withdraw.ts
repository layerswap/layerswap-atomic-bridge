import 'dotenv/config';
import { ETH } from '../config';
import { EvmHtlc } from '@layerswap/evm';

async function withdraw(contractId: string, proof: string) {
  const { PRIVATE_KEYS, NETWORK } = ETH;
  const client = new EvmHtlc(NETWORK.TEST.sepolia.native.endpoint, NETWORK.TEST.sepolia.native.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const toAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;
  const result = await client.withdraw(contractId, toAddress, proof);

  console.log(
    `----- Start withdraw https://sepolia.etherscan.io/tx/${result.transactionHash} -----`,
    await client.getContractInfo(result.events.EtherTransferClaimed.returnValues.contractId)
  );
}

async function start() {
  const contractId = ''; // Replace with the contract ID
  const proof = ''; // Replace with the proof

  await withdraw(contractId, proof);
}

start();
