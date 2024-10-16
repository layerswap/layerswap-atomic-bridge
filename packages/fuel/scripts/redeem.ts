import { Contract, Wallet, Provider, Address,WalletUnlocked } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0xc58d73c0515ff40d01b919b3ed9fb16891a6b631ca57f5613e6ec26729e81305';

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
