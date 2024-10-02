import { Contract, Wallet, Provider, BN, Address, DateTime, WalletUnlocked } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0x33dab65c45258fea05215fca2a2578fb94b13920d5a736e02ac9aae517b2bd96';

async function getWalletBalances() {
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const mnemonic = 'energy knife treat involve affair tobacco school verb risk laugh exchange vendor';
  const wallet: WalletUnlocked = Wallet.fromMnemonic(mnemonic);
  wallet.connect(provider);

  const contractAddress = Address.fromB256(contractAddressString);
  const contractInstance = new Contract(contractAddress, contractAbi, wallet);
  const Id = 1n;
  const hashlock = "0xd4a671c0bb24f780c8ed7c13cfb6a554585bea038416afdcf806e73381db8417";
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
