import { Contract, Wallet, Provider, BN, Address, DateTime, WalletUnlocked } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0x00f3dfc843089523a41a08a611ad39eef57de6ebdb58915840ed81d3fe9a5476';

async function getWalletBalances() {
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const mnemonic = 'energy knife treat involve affair tobacco school verb risk laugh exchange vendor';
  const wallet: WalletUnlocked = Wallet.fromMnemonic(mnemonic);
  wallet.connect(provider);

// NOTE: All string variables should be padded to ensure they have 64 characters,
// as the contract accepts only the str[64] type for string inputs.
  const dstChain = 'TON'.padEnd(64, ' ');
  const dstAsset = "Toncoin".padEnd(64, ' ');
  const dstAddress = "0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y".padEnd(64, ' ');
  const srcAsset = "ETH".padEnd(64, ' ');
  const srcReceiver = {"bits":"0x6364b23e8c34d46d0b68d20e0c1463230a9243a1dd710a7dd8b32dfb927af53a"};
  const currentUnixTime = Math.floor(Date.now() / 1000) + 10;
  const timelock = DateTime.fromUnixSeconds(currentUnixTime).toTai64();           

  const contractAddress = Address.fromB256(contractAddressString);
  const contractInstance = new Contract(contractAddress, contractAbi, wallet);

  try {
    const { transactionId, waitForResult } = await contractInstance.functions
      .commit(dstChain, dstAsset, dstAddress, srcAsset, srcReceiver, timelock)
      .callParams({
        forward: [1, provider.getBaseAssetId()],
      })
      .call();

    const { logs,value } = await waitForResult();

    console.log('tx id: ', transactionId);
    console.log('Commit function logs:', logs);
    console.log('Commit function result:', value);
  } catch (error) {
    console.error('Error calling commit function:', error);
  }
}

getWalletBalances().catch(console.error);


