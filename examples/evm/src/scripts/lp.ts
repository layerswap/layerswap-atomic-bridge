import { checkConfirmations, getContractEventListener, log, subscribeToEvent } from './helper';
import { ChainID, PreEvmHtlc } from '@layerswap/evm';
import {
  ARBITRUM_RPC_ENDPOINT,
  ARBITRUM_WSS_ENDPOINT,
  LP_PRIVATE_KEY,
  OPTIMISM_MESSANGER_ADDRESS,
  OPTIMISM_RPC_ENDPOINT,
  PRE_HTLC_CONTRACT_ADDRESS,
} from '../config';

(async () => {
  let hashPair: { secret: string; proof: string };
  const chain = 'Arbitrum';
  const clientArb = new PreEvmHtlc(ARBITRUM_RPC_ENDPOINT, PRE_HTLC_CONTRACT_ADDRESS);
  const clientOp = new PreEvmHtlc(OPTIMISM_RPC_ENDPOINT, PRE_HTLC_CONTRACT_ADDRESS);

  const accounts = clientOp.web3.eth.accounts;
  const lpAddress = accounts.wallet.add(LP_PRIVATE_KEY).address;
  const startTime = Date.now();
  let totalL1Fee = clientOp.web3.utils.toBN(0);
  let totalL2Fee = clientOp.web3.utils.toBN(0);

  const processPreInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferPreInitiated" event detected on ${chain}`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientArb, transactionHash);
      await createHTLCTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const processTransferInitiatedEvent = async (event: any) => {
    const { transactionHash, returnValues } = event;

    log('\n');
    log(`"EtherTransferClaimed" (convertP) event detected on ${chain}`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientArb, transactionHash);
      await createRedeemTransaction(returnValues);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const processTransferClaimedEvent = async (event: any) => {
    const { transactionHash } = event;

    log('\n');
    log(`"EtherTransferClaimed" event detected on Arbitrum`);
    log(`Hash: ${transactionHash}`);

    try {
      await checkConfirmations(clientArb, transactionHash);
      const totalCostEthBN = totalL2Fee.add(totalL1Fee);
      const formattotalCostEthBN = clientOp.web3.utils.fromWei(totalCostEthBN.toString(), 'ether');

      log(`Total fee: ${formattotalCostEthBN.toString()} ETH`);
      log(`Execution Time: ${(Date.now() - startTime) / 1000} seconds`);
      log(`Done! Burger time! 🍔🍟🥤`);
      process.exit(0);
    } catch (error) {
      log('Error checking confirmations:', error);
    }
  };

  const createHTLCTransaction = async (returnValues: any) => {
    const { phtlcID, dstAddress, srcAddress, timelock, amount } = returnValues;
    log('LP is preparing to make a "create" transaction on Optimism (phtlcID: %s)', phtlcID);
    hashPair = clientOp.createHashPair();
    const extendTimelock = Number(timelock) + 600; // extend timelock by 10 minutes

    log('Generating hash pair...');
    console.table(hashPair);

    try {
      const receipt = await clientOp.createHtlc(
        dstAddress,
        hashPair.secret,
        extendTimelock,
        ChainID.ARBITRUM,
        srcAddress,
        phtlcID,
        OPTIMISM_MESSANGER_ADDRESS,
        {
          senderAddress: lpAddress,
          amount,
        }
      );

      log(`Create HTLC Transaction sent: ${receipt.transactionHash}`);

      const l1Fee = clientOp.web3.utils.hexToNumberString(receipt.l1Fee);
      totalL1Fee = totalL1Fee.add(clientOp.web3.utils.toBN(l1Fee));

      const gasUsedBN = clientOp.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientOp.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);
    } catch (error) {
      log('Error creating HTLC transaction on Optimism:', error);
    }
  };

  const createRedeemTransaction = async (returnValues: any) => {
    log('The LP is preparing to make a "redeem" transaction on Optimism...');
    const { hashlock } = returnValues;

    try {
      const receipt = await clientOp.redeem(hashlock, hashPair.proof, {
        senderAddress: lpAddress,
      });

      log(`Redeem transaction sent: ${receipt.transactionHash}`);

      const l1Fee = clientOp.web3.utils.hexToNumberString(receipt.l1Fee);
      totalL1Fee = totalL1Fee.add(clientOp.web3.utils.toBN(l1Fee));

      const gasUsedBN = clientOp.web3.utils.toBN(receipt.gasUsed);
      const totalCostWeiBN = gasUsedBN.mul(clientOp.web3.utils.toBN(receipt.effectiveGasPrice));

      totalL2Fee = totalL2Fee.add(totalCostWeiBN);
    } catch (error) {
      log(`Error creating redeem transaction: ${error}`);
    }
  };

  const listenForUserTransaction = async () => {
    const contract = await getContractEventListener(ARBITRUM_WSS_ENDPOINT);
    log(`The LP has initiated listening for user transaction on ${chain}...`);
    subscribeToEvent(contract, 'EtherTransferPreInitiated', processPreInitiatedEvent);
    subscribeToEvent(contract, 'EtherTransferInitiated', processTransferInitiatedEvent);
    subscribeToEvent(contract, 'EtherTransferClaimed', processTransferClaimedEvent);
  };

  await listenForUserTransaction();
})();
