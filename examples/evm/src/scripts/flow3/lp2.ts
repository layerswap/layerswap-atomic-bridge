// Arbitrum, Optimism, Linea
import { checkConfirmations, getContractEventListener, getIncreasedGasPrice, log, subscribeToEvent } from '../helper';
import { ChainID, PreEvmHtlc } from '@layerswap/evm';
import {
  OPTIMISM_RPC_ENDPOINT,
  OPTIMISM_WSS_ENDPOINT,
  OP_HTLC_CONTRACT_ADDRESS,
  LP2_PRIVATE_KEY,
  LINEA_RPC_ENDPOINT,
  LINEA_HTLC_CONTRACT_ADDRESS,
  LINEA_MESSANGER_ADDRESS,
} from '../../config';

(async () => {
  let hashPair: { secret: string; proof: string };
  const clientLinea = new PreEvmHtlc(LINEA_RPC_ENDPOINT, LINEA_HTLC_CONTRACT_ADDRESS);
  const clientOp = new PreEvmHtlc(OPTIMISM_RPC_ENDPOINT, OP_HTLC_CONTRACT_ADDRESS);

  let totalL1Fee = clientOp.web3.utils.toBN(0);
  let totalL2Fee = clientOp.web3.utils.toBN(0);

  const startTime = Date.now();
  const accounts = clientLinea.web3.eth.accounts;
  const lp2Address = accounts.wallet.add(LP2_PRIVATE_KEY).address;
  const gasPriceWei = await clientLinea.web3.eth.getGasPrice();

  const processPreInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferPreInitiated" event detected on Optimism`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientOp, transactionHash);
      await createHTLCTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createHTLCTransaction = async (returnValues: any) => {
    const { phtlcID, dstAddress, srcAddress, timelock, amount } = returnValues;
    log('LP2 is preparing to make a "create" transaction on Linea (phtlcID: %s)', phtlcID);
    hashPair = clientLinea.createHashPair();
    const extendTimelock = Number(timelock) + 600; // extend timelock by 10 minutes

    log('Generating hash pair...');
    console.table(hashPair);

    try {
      const receipt = await clientLinea.createHtlc(
        dstAddress,
        hashPair.secret,
        extendTimelock,
        ChainID.ARBITRUM,
        srcAddress,
        phtlcID,
        LINEA_MESSANGER_ADDRESS,
        {
          senderAddress: lp2Address,
          amount,
          gasPrice: gasPriceWei,
        }
      );

      log(`Create HTLC Transaction sent: ${receipt.transactionHash}`);

      const gasUsedBN = clientLinea.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientLinea.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);
    } catch (error) {
      log('Error creating HTLC transaction on Linea:', error);
    }
  };

  const processTransferInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferClaimed" (convertP) event detected on Optimism`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientOp, transactionHash);
      await createUserRedeemTransaction(returnValues);

      // Redeem funds on Optimism
      await createRedeemTransaction(returnValues);
    } catch (error) {
      log('Error processTransferInitiatedEvent:', error);
    }
  };

  const createUserRedeemTransaction = async (returnValues: any) => {
    log('\n');
    log('The LP2 is preparing to make a "redeem" transaction for user on Linea...');
    const { hashlock } = returnValues;

    try {
      const receipt = await clientLinea.redeem(hashlock, hashPair.proof, {
        senderAddress: lp2Address,
        gasPrice: gasPriceWei,
      });

      log(`User redeem transaction sent: ${receipt.transactionHash}`);

      await checkConfirmations(clientLinea, receipt.transactionHash);

      // Current transaction fee spent on Arbitrum
      const gasUsedBN = clientLinea.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientLinea.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);

      // Total transaction fee spent
      const totalCostEthBN = totalL2Fee.add(totalL1Fee);
      const formattotalCostEthBN = clientLinea.web3.utils.fromWei(totalCostEthBN.toString(), 'ether');

      log(`Total fee: ${formattotalCostEthBN.toString()} ETH`);
      log(`Execution time after user funds are redeemed : ${(Date.now() - startTime) / 1000} seconds`);
    } catch (error) {
      log(`Error creating user redeem transaction: ${error}`);
    }
  };

  const createRedeemTransaction = async (returnValues: any) => {
    log('The LP2 is preparing to make a "redeem" transaction on Optimism...');
    const { hashlock } = returnValues;
    const accounts = clientOp.web3.eth.accounts;
    const lp2Address = accounts.wallet.add(LP2_PRIVATE_KEY).address;

    // Get current gas price and increase it by 20% (OP)
    const gasPriceWei = await getIncreasedGasPrice(clientOp.web3, 20);

    try {
      const receipt = await clientOp.redeem(hashlock, hashPair.proof, {
        gasPrice: gasPriceWei,
        senderAddress: lp2Address,
      });

      log(`Redeem transaction sent: ${receipt.transactionHash}`);

      await checkConfirmations(clientOp, receipt.transactionHash);

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
      log(`Error creating redeem transaction: ${error}`);
    }
  };

  const listenForTransaction = async () => {
    const contract = await getContractEventListener(OPTIMISM_WSS_ENDPOINT, OP_HTLC_CONTRACT_ADDRESS);
    log(`The LP2 has initiated listening for user transaction on Optimism...`);
    subscribeToEvent(contract, 'EtherTransferPreInitiated', processPreInitiatedEvent);
    subscribeToEvent(contract, 'EtherTransferInitiated', processTransferInitiatedEvent);
  };

  await listenForTransaction();
})();
