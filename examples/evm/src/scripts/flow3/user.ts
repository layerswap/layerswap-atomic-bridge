// Arbitrum, Optimism, Linea;
import {
  ARBITRUM_MESSANGER_ADDRESS,
  ARBITRUM_RPC_ENDPOINT,
  LP_ADDRESS,
  LP2_ADDRESS,
  ARB_HTLC_CONTRACT_ADDRESS,
  USER_PRIVATE_KEY,
  USER_TIMELOCK_SECONDS,
  LINEA_WSS_ENDPOINT,
  LINEA_HTLC_CONTRACT_ADDRESS,
  LINEA_RPC_ENDPOINT,
} from '../../config';
import { checkConfirmations, getContractEventListener, log, subscribeToEvent } from '../helper';
import { ChainID, AssetID, PreEvmHtlc } from '@layerswap/evm';

(async () => {
  const clientLinea = new PreEvmHtlc(LINEA_RPC_ENDPOINT, LINEA_HTLC_CONTRACT_ADDRESS);
  const clientArb = new PreEvmHtlc(ARBITRUM_RPC_ENDPOINT, ARB_HTLC_CONTRACT_ADDRESS);

  let totalGasUsed = 0;
  const accounts = clientArb.web3.eth.accounts;
  const userAddress = accounts.wallet.add(USER_PRIVATE_KEY).address;
  const timelock = Math.floor(Date.now() / 1000) + USER_TIMELOCK_SECONDS; // Current time + 1 hour
  const startTime = Date.now();
  const gasPriceWei = await clientArb.web3.eth.getGasPrice();

  const createPre = async () => {
    log('User creating transaction on Arbitrum...');

    const receipt = await clientArb.createPre(
      [ChainID.OPTIMISM],
      [LP2_ADDRESS], // Router address path
      ChainID.LINEA,
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
    log(`"EtherTransferInitiated" event detected on Linea`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientLinea, transactionHash);
      await createConvertPTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createConvertPTransaction = async (returnValues: any) => {
    const { hashlock, phtlcID } = returnValues;
    log('The user is preparing to make a "convertP" transaction on Arbitrum (phtlcID: %s)', phtlcID);

    try {
      const receipt = await clientArb.convertP(phtlcID, hashlock, {
        senderAddress: userAddress,
      });

      log(`ConvertP transaction sent: ${receipt.transactionHash}`);
      totalGasUsed += receipt.gasUsed;

      await checkConfirmations(clientArb, receipt.transactionHash);
      const gasUsedBN = clientArb.web3.utils.toBN(totalGasUsed);
      const totalCostWeiBN = clientArb.web3.utils.toBN(gasPriceWei).mul(gasUsedBN);
      const totalCostEthBN = clientArb.web3.utils.fromWei(totalCostWeiBN.toString(), 'ether');

      log(`Total fee: ${totalCostEthBN.toString()} ETH`);
      log(`Execution Time: ${(Date.now() - startTime) / 1000} seconds`);
      log(`Done!`);
      process.exit(0);
    } catch (error) {
      log(`Error creating convertP transaction: ${error}`);
    }
  };

  const listenForLpTransaction = async () => {
    const contract = await getContractEventListener(LINEA_WSS_ENDPOINT, LINEA_HTLC_CONTRACT_ADDRESS);
    log(`The user has initiated listening for LP2 transactions on Linea....`);
    subscribeToEvent(contract, 'EtherTransferInitiated', processTransferInitiatedEvent);
  };

  await createPre();
})();
