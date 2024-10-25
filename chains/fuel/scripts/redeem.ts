import { Contract, Wallet, Provider, Address,WalletUnlocked } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0x81bb60bf7cdadcf4061a932685a68871dfe14eab4dcfead6059fe4f8f2651737';

async function getWalletBalances() {
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const mnemonic = 'energy knife treat involve affair tobacco school verb risk laugh exchange vendor';
  const wallet: WalletUnlocked = Wallet.fromMnemonic(mnemonic);
  wallet.connect(provider);

  const contractAddress = Address.fromB256(contractAddressString);
  const contractInstance = new Contract(contractAddress, contractAbi, wallet);
  const Id = 1n;
  const secret = 33648946896879551350753991616036334622602839139780100591470253765180571691018n;       

  try {
    const { transactionId, waitForResult } = await contractInstance.functions
      .redeem(Id,secret)
      .call();

    const { logs,value } = await waitForResult();

    console.log('tx id: ', transactionId);
    console.log('redeem function logs: ',logs);
    console.log('redeem function result:', value);
  } catch (error) {
    console.error('Error calling redeem function:', error);
  }
}

getWalletBalances().catch(console.error);
