import { Contract, Wallet, Provider, BN, Address, DateTime, WalletUnlocked } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0x00f3dfc843089523a41a08a611ad39eef57de6ebdb58915840ed81d3fe9a5476';

async function getWalletBalances() {
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const mnemonic = 'energy knife treat involve affair tobacco school verb risk laugh exchange vendor';
  // const mnemonic = 'connect people age absurd suggest river trust lunch joke clerk clinic blind';
  const wallet: WalletUnlocked = Wallet.fromMnemonic(mnemonic);
  wallet.connect(provider);

  const contractAddress = Address.fromB256(contractAddressString);
  const contractInstance = new Contract(contractAddress, contractAbi, wallet);
  const Id = 54079385413661825002756453772014361870896886140818619726462513491823303364787n;
  const hashlock = "0x3b7674662e6569056cef73dab8b7809085a32beda0e8eb9e9b580cfc2af22a55";
  const currentUnixTime = Math.floor(Date.now() / 1000) + 3600;
  const timelock = DateTime.fromUnixSeconds(currentUnixTime).toTai64();           

  try {
    const { transactionId, waitForResult } = await contractInstance.functions
      .add_lock(Id,hashlock,timelock)
      .call();

    const { logs,value } = await waitForResult();

    console.log('tx id: ', transactionId);
    console.log('add_lock function logs: ',logs);
    console.log('add_lock function result:', value);
  } catch (error) {
    console.error('Error calling add_lock function:', error);
  }
}

getWalletBalances().catch(console.error);
