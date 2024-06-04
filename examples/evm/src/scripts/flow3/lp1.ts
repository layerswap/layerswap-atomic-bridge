// Arbitrum, Optimism, Linea
import { checkConfirmations, getContractEventListener, getIncreasedGasPrice, log, subscribeToEvent } from '../helper';
import { PreEvmHtlc } from '@layerswap/evm';
import {
  ARBITRUM_RPC_ENDPOINT,
  ARBITRUM_WSS_ENDPOINT,
  LP_PRIVATE_KEY,
  OPTIMISM_MESSANGER_ADDRESS,
  OPTIMISM_RPC_ENDPOINT,
  ARB_HTLC_CONTRACT_ADDRESS,
  OP_HTLC_CONTRACT_ADDRESS,
  LP2_ADDRESS,
  OPTIMISM_WSS_ENDPOINT,
  LINEA_WSS_ENDPOINT,
  LINEA_HTLC_CONTRACT_ADDRESS,
  LINEA_RPC_ENDPOINT,
} from '../../config';

(async () => {
  const clientArb = new PreEvmHtlc(ARBITRUM_RPC_ENDPOINT, ARB_HTLC_CONTRACT_ADDRESS);
  const clientOp = new PreEvmHtlc(OPTIMISM_RPC_ENDPOINT, OP_HTLC_CONTRACT_ADDRESS);

  const startTime = Date.now();
  const accounts = clientOp.web3.eth.accounts;
  const lpAddress = accounts.wallet.add(LP_PRIVATE_KEY).address;

  // Get current gas price and increase it by 20% (OP)
  const gasPriceWei = await getIncreasedGasPrice(clientOp.web3, 20);

  let totalL1Fee = clientOp.web3.utils.toBN(0);
  let totalL2Fee = clientOp.web3.utils.toBN(0);

  const processPreInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferPreInitiated" event detected on Arbitrum`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientArb, transactionHash);
      await createPreHTLCTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createPreHTLCTransaction = async (returnValues: any) => {
    log('LP1 is preparing to make a "PreHTLC" transaction on Optimism');
    const { chainIds, dstAddresses, dstChainId, dstAssetId, dstAddress, srcAssetId, _srcAddress, timelock, _amount } =
      returnValues;

    // Copy array and remove the last address in the path
    const dstAddressPath = Array.from(dstAddresses) as string[];
    dstAddressPath.pop();

    try {
      const receipt = await clientOp.createPre(
        chainIds,
        dstAddressPath,
        dstChainId,
        dstAssetId,
        dstAddress,
        srcAssetId,
        LP2_ADDRESS,
        timelock,
        OPTIMISM_MESSANGER_ADDRESS,
        {
          senderAddress: lpAddress,
          // User's _amount is 1000 Kwei, so the LP's amount should be 1 here. Adjust later to use from event
          amount: 1,
          gasPrice: gasPriceWei,
        }
      );

      log(`Create PreHTLC Transaction sent: ${receipt.transactionHash}`);

      const l1Fee = clientOp.web3.utils.hexToNumberString(receipt.l1Fee);
      totalL1Fee = totalL1Fee.add(clientOp.web3.utils.toBN(l1Fee));

      const gasUsedBN = clientOp.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientOp.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);
    } catch (error) {
      log('Error creating PreHTLC transaction:', error);
    }
  };

  const processTransferInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferInitiated" event detected on Linea`);
    log(`Hash: ${transactionHash}`);

    try {
      const clientLinea = new PreEvmHtlc(LINEA_RPC_ENDPOINT, LINEA_HTLC_CONTRACT_ADDRESS);

      await checkConfirmations(clientLinea, transactionHash);
      await createConvertPTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createConvertPTransaction = async (returnValues: any) => {
    const { hashlock, phtlcID } = returnValues;
    log('The LP1 is preparing to make a "convertP" transaction on Optimism (phtlcID: %s)', phtlcID);

    try {
      const receipt = await clientOp.convertP(phtlcID, hashlock, {
        senderAddress: lpAddress,
        gasPrice: gasPriceWei,
      });

      log(`ConvertP transaction sent: ${receipt.transactionHash}`);

      // Current transaction fee spent
      const l1Fee = clientOp.web3.utils.hexToNumberString(receipt.l1Fee);
      totalL1Fee = totalL1Fee.add(clientOp.web3.utils.toBN(l1Fee));

      const gasUsedBN = clientOp.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientOp.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);

      // Total transaction fee spent
      const totalCostEthBN = totalL2Fee.add(totalL1Fee);
      const formattotalCostEthBN = clientOp.web3.utils.fromWei(totalCostEthBN.toString(), 'ether');

      log(`Total fee: ${formattotalCostEthBN.toString()} ETH`);
      log(`Execution Time: ${(Date.now() - startTime) / 1000} seconds`);
      log(`Done!`);
      process.exit(0);
    } catch (error) {
      log(`Error creating convertP transaction: ${error}`);
    }
  };

  const processTransferClaimedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferClaimed" event detected on Optimism`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientOp, transactionHash);
      await createRedeemTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createRedeemTransaction = async (returnValues: any) => {
    log('The LP1 is preparing to make a "redeem" transaction on Optmism...');
    const { htlcId } = returnValues;

    try {
      const htlcInfo = await clientOp.getContractInfo(htlcId);
      const receipt = await clientOp.redeem(htlcId, htlcInfo.secret, {
        senderAddress: lpAddress,
      });

      log(`Redeem transaction sent: ${receipt.transactionHash}`);

      await checkConfirmations(clientOp, receipt.transactionHash);

      const l1Fee = clientOp.web3.utils.hexToNumberString(receipt.l1Fee);
      totalL1Fee = totalL1Fee.add(clientOp.web3.utils.toBN(l1Fee));

      const gasUsedBN = clientOp.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientOp.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);

      const totalCostEthBN = totalL2Fee.add(totalL1Fee);
      const formattotalCostEthBN = clientOp.web3.utils.fromWei(totalCostEthBN.toString(), 'ether');

      log(`Total fee: ${formattotalCostEthBN.toString()} ETH`);
      log(`Execution Time: ${(Date.now() - startTime) / 1000} seconds`);
      log(`Done!`);
      process.exit(0);
    } catch (error) {
      log(`Error creating redeem transaction: ${error}`);
    }
  };

  const listenForUserTransaction = async () => {
    const contract = await getContractEventListener(ARBITRUM_WSS_ENDPOINT, ARB_HTLC_CONTRACT_ADDRESS);
    log(`The LP1 has initiated listening for user transaction on Arbitrum...`);
    subscribeToEvent(contract, 'EtherTransferPreInitiated', processPreInitiatedEvent);

    console.log('\n');
    const contractOp = await getContractEventListener(OPTIMISM_WSS_ENDPOINT, OP_HTLC_CONTRACT_ADDRESS);
    log(`The LP1 has initiated listening for LP2 transaction on Optmism...`);

    subscribeToEvent(contractOp, 'EtherTransferClaimed', processTransferClaimedEvent);

    console.log('\n');
    const contractLinea = await getContractEventListener(LINEA_WSS_ENDPOINT, LINEA_HTLC_CONTRACT_ADDRESS);
    log(`The LP1 has initiated listening for LP2 transactions on Linea....`);
    subscribeToEvent(contractLinea, 'EtherTransferInitiated', processTransferInitiatedEvent);
  };

  await listenForUserTransaction();
})();
