import Web3 from 'web3';
import { PreEvmHtlc, PreHashedTimeLockEtherABI } from '@layerswap/evm';
import Contract from 'web3-eth-contract';
import { CONFIRMATION_THRESHOLD } from '../config';

export const log = (message: string, ...args: any[]) => {
  console.log(`[${new Date().toISOString()}] - ${message}`, ...args);
};

export const measureExecutionTime = async (fn: () => Promise<any>) => {
  const startTime = Date.now();

  await fn();

  const endTime = Date.now();
  return endTime - startTime;
};

export const subscribeToEvent = async (contract: Contract, eventName: string, callback: (event: any) => void) => {
  const subscription = await contract.events[eventName]();

  subscription.on('connected', (subscriptionId: any) => {
    log(`SubID: ${subscriptionId}`);
    log(`Listening for event '${eventName}'`);
  });

  subscription.on('data', (event: any) => {
    callback(event);
  });

  subscription.on('changed', (event: any) => {
    log(`'${eventName}' changed:`, event);
  });

  subscription.on('error', (error: any) => {
    error(`'${eventName}' error:`, error);
  });
};

export const getContractEventListener = async (wssEndpoint: string, contractAddress: string) => {
  const provider = new Web3.providers.WebsocketProvider(wssEndpoint, {
    clientConfig: {
      // Useful to keep a connection alive
      keepalive: true,
      keepaliveInterval: 60000, // ms
    },
    reconnect: {
      auto: true,
      delay: 10000, // ms
      maxAttempts: 5,
      onTimeout: false,
    },
  });

  provider.on('connect', () => {
    log(`Connected to websocket provider`);
  });

  provider.on('disconnect', () => {
    log(`Closed webSocket connection`);
  });

  const web3 = new Web3(provider);

  return new web3.eth.Contract(PreHashedTimeLockEtherABI, contractAddress);
};

export const checkConfirmations = (
  client: PreEvmHtlc,
  transactionHash: string,
  delay: number = 10000
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const check = async () => {
      try {
        const receipt = await client.web3.eth.getTransactionReceipt(transactionHash);
        if (receipt && receipt.blockNumber) {
          log(`Checking transaction confirmations...`);
          const currentBlock = await client.web3.eth.getBlockNumber();
          const confirmations = currentBlock - receipt.blockNumber;

          if (confirmations >= CONFIRMATION_THRESHOLD) {
            log(`Transaction confirmed with ${confirmations} confirmations`);
            resolve();
          } else {
            log(`Transaction has ${confirmations} confirmations, waiting for ${CONFIRMATION_THRESHOLD}...`);
            setTimeout(check, delay);
          }
        } else {
          log('Waiting for the transaction to be mined...');
          setTimeout(check, delay);
        }
      } catch (error) {
        log('Error checking transaction confirmations:', error);
        reject(error);
      }
    };

    check();
  });
};

export const getIncreasedGasPrice = async (web3Instance: Web3, increasePercent: number): Promise<string> => {
  const percent = web3Instance.utils.toBN(increasePercent);
  const hundredPercent = web3Instance.utils.toBN(100);
  const increaseFactor = hundredPercent.add(percent);
  let gasPriceWei = await web3Instance.eth.getGasPrice();

  gasPriceWei = web3Instance.utils.toBN(gasPriceWei).mul(increaseFactor).div(hundredPercent).toString();

  return gasPriceWei;
};
