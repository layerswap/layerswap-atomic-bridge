import { Contract, Wallet, Provider, BN, Address, DateTime, WalletUnlocked } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0xed0b3a20a5a0f6e0f6fec1a9f27630fde03fba04cb304c575543946eaf3d8756';

async function getWalletBalances() {
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const mnemonic = 'energy knife treat involve affair tobacco school verb risk laugh exchange vendor';
  const wallet: WalletUnlocked = Wallet.fromMnemonic(mnemonic);
  wallet.connect(provider);

  const contractAddress = Address.fromB256(contractAddressString);
  const contractInstance = new Contract(contractAddress, contractAbi, wallet);
  const senderAddr = {"bits": "0xb926273e0f7b0baa022f78fac77c428bb2a5034508630d6bd9c076d2d512b899"}

  try {
    const { transactionId, waitForResult } = await contractInstance.functions
      .get_contracts(senderAddr)
      .call();

    const { value } = await waitForResult();

    console.log('tx id: ', transactionId);
    console.log('get_details function result:', value);
  } catch (error) {
    console.error('Error calling commit function:', error);
  }
}

getWalletBalances().catch(console.error);
