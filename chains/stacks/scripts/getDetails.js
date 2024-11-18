import { uintCV, callReadOnlyFunction, getPublicKey,createStacksPrivateKey} from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const contractAddress = 'ST2R1JC4FWF70GM9M7C7F4WH76PVZCSNHHP1EBKGM';
const contractName = 'redeemTest';
const functionName = 'get-contract-details';

const uintValue = uintCV(BigInt('41305506774033082'));

const network = new StacksTestnet();
const senderAddress = 'ST2R1JC4FWF70GM9M7C7F4WH76PVZCSNHHP1EBKGM';

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
