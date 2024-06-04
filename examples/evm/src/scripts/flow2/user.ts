import {
  ARBITRUM_MESSANGER_ADDRESS,
  ARBITRUM_RPC_ENDPOINT,
  LP_ADDRESS,
  OPTIMISM_RPC_ENDPOINT,
  OPTIMISM_WSS_ENDPOINT,
  ARB_HTLC_CONTRACT_ADDRESS,
  OP_HTLC_CONTRACT_ADDRESS,
  USER_PRIVATE_KEY,
  USER_TIMELOCK_SECONDS,
} from '../../config';
import { checkConfirmations, getContractEventListener, log, subscribeToEvent } from '../helper';
import { ChainID, AssetID, PreEvmHtlc } from '@layerswap/evm';

(async () => {
  const client = new PreEvmHtlc(ARBITRUM_RPC_ENDPOINT, ARB_HTLC_CONTRACT_ADDRESS);
  const clientOp = new PreEvmHtlc(OPTIMISM_RPC_ENDPOINT, OP_HTLC_CONTRACT_ADDRESS);

  const accounts = client.web3.eth.accounts;
  const userAddress = accounts.wallet.add(USER_PRIVATE_KEY).address;
  const timelock = Math.floor(Date.now() / 1000) + USER_TIMELOCK_SECONDS; // Current time + 1 hour
  let totalGasUsed = 0;
  const startTime = Date.now();
  const gasPriceWei = await client.web3.eth.getGasPrice();

  const createPre = async () => {
    log('User creating transaction on Arbitrum...');

    const receipt = await client.createPre(
      [ChainID.OPTIMISM],
      [LP_ADDRESS],
      ChainID.ARBITRUM,
      AssetID.ETH,
      userAddress,
      AssetID.ETH,
      LP_ADDRESS,
      timelock,
      ARBITRUM_MESSANGER_ADDRESS,
      {
        senderAddress: userAddress,
        amount: 1,
      }
    );

    log(`CreatePre transaction sent: ${receipt.transactionHash}`);
    totalGasUsed += receipt.gasUsed;

    await listenForLpTransaction();
  };

  const processTransferInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferInitiated" event detected on Optimism`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientOp, transactionHash);
      await createConvertPTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createConvertPTransaction = async (returnValues: any) => {
    const { hashlock, phtlcID } = returnValues;
    log('The user is preparing to make a "convertP" transaction on Arbitrum (phtlcID: %s)', phtlcID);

    try {
      const receipt = await client.convertP(phtlcID, hashlock, {
        senderAddress: userAddress,
      });

      log(`ConvertP transaction sent: ${receipt.transactionHash}`);
      totalGasUsed += receipt.gasUsed;

      await checkConfirmations(client, receipt.transactionHash);
      const gasUsedBN = client.web3.utils.toBN(totalGasUsed);
      const totalCostWeiBN = client.web3.utils.toBN(gasPriceWei).mul(gasUsedBN);
      const totalCostEthBN = client.web3.utils.fromWei(totalCostWeiBN.toString(), 'ether');

      log(`Total fee: ${totalCostEthBN.toString()} ETH`);
      log(`Execution Time: ${(Date.now() - startTime) / 1000} seconds`);
      log(`Done!`);
      process.exit(0);
    } catch (error) {
      log(`Error creating convertP transaction: ${error}`);
    }
  };

  const listenForLpTransaction = async () => {
    const contract = await getContractEventListener(OPTIMISM_WSS_ENDPOINT, OP_HTLC_CONTRACT_ADDRESS);
    console.log('\n');
    log(`The user has initiated listening for LP transactions on Arbitrum....`);
    subscribeToEvent(contract, 'EtherTransferInitiated', processTransferInitiatedEvent);
  };

  await createPre();
})();
