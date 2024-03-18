import 'dotenv/config';
import { ETH } from '../config';
import { EvmErc20Htlc } from '@layerswap/evm';

async function lock(hashlock) {
  // setup
  const { PRIVATE_KEYS, NETWORK, ERC20_TOKEN_ADDRESS } = ETH;
  const chainId = 1; // example chain ID
  const receiverChainAddress = '0x60f8212132210acDB8E526f31fC84feaC6E9535B'; // example receiver chain address
  const client = new EvmErc20Htlc(NETWORK.TEST.sepolia.erc20.endpoint, NETWORK.TEST.sepolia.erc20.contractAddress);
  const AccountService = client.web3.eth.accounts;
  const fromAddress = AccountService.wallet.add(PRIVATE_KEYS.FROM).address;
  const toAddress = AccountService.wallet.add(PRIVATE_KEYS.TO).address;
  // lock
  const result = await client.lock(
    toAddress,
    fromAddress,
    hashlock,
    1,
    ERC20_TOKEN_ADDRESS,
    chainId,
    receiverChainAddress
  );
  const contractId = result.events.TokenTransferInitiated.returnValues.contractId;
  console.log('----- Lock transaction enlistment completed -----', {
    fromAddress: fromAddress,
    toAddress: toAddress,
    contractId,
    transactionHash: result.transactionHash,
    secret: hashlock,
    contractInfo: await client.getContractInfo(contractId),
  });
}

async function start() {
  const hashlock = ''; // Replace with the hashlock

  await lock(hashlock);
}

start();
