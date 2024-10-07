import { uintCV, callReadOnlyFunction, getPublicKey,createStacksPrivateKey} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const contractAddress = 'ST136VTJP5KQ24EDMKWP0PJ44VVHMGX4KNKAW3XW5';
const contractName = 'marco';
const functionName = 'get-contract-details';

const uintValue = uintCV(BigInt('41284274423257323'));

const network = new StacksTestnet();
const senderAddress = 'ST136VTJP5KQ24EDMKWP0PJ44VVHMGX4KNKAW3XW5';

const options = {
  contractAddress,
  contractName,
  functionName,
  functionArgs: [uintValue],
  network,
  senderAddress,
};

const result = await callReadOnlyFunction(options);

console.log(result.value.data);
