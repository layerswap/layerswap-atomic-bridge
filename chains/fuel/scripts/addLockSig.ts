import { Contract, Wallet, Provider, Address, DateTime, WalletUnlocked, Signer, sha256, bn, hashMessage, keccak256, arrayify, hexlify, BytesLike } from 'fuels';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.join(__dirname, '../out/release/fuel-abi.json');
const contractAbi = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

const contractAddressString = '0xc58d73c0515ff40d01b919b3ed9fb16891a6b631ca57f5613e6ec26729e81305';

async function getWalletBalances() {
  const provider = await Provider.create('https://testnet.fuel.network/v1/graphql');
  const signerMnemonic = 'energy knife treat involve affair tobacco school verb risk laugh exchange vendor';
  const signerWallet: WalletUnlocked = Wallet.fromMnemonic(signerMnemonic);
  signerWallet.connect(provider);
  
  const senderMnemonic = 'connect people age absurd suggest river trust lunch joke clerk clinic blind';
  const senderWallet: WalletUnlocked = Wallet.fromMnemonic(senderMnemonic);
  senderWallet.connect(provider);

  const contractAddress = Address.fromB256(contractAddressString);
  const contractInstance = new Contract(contractAddress, contractAbi, senderWallet);
  const Id = 2n;
  const hashlock = "0x3b7674662e6569056cef73dab8b7809085a32beda0e8eb9e9b580cfc2af22a55";
  const currentUnixTime = Math.floor(Date.now() / 1000) + 3600;
  const timelock = DateTime.fromUnixSeconds(currentUnixTime).toTai64();

  const IdHex = '0x' + Id.toString(16).padStart(64, '0');
  const timelockHex = '0x' + BigInt(timelock).toString(16).padStart(64, '0');

  const msg = [IdHex,hashlock,timelockHex];

  const msgBytes = Uint8Array.from(
  msg.flatMap(hexStr => Array.from(arrayify(hexStr)))
);
  let signedmessage = signerWallet.signer().sign(sha256(msgBytes))
  const signature  = hexlify(signedmessage) 
  console.log('signiature verifeid off chain: ',signerWallet.address.toB256() == Signer.recoverAddress(sha256(msgBytes),signature).toB256());

  try {
    const { transactionId, waitForResult } = await contractInstance.functions
      .add_lock_sig(signature,IdHex,hashlock,timelock)
      .call();

    const { logs,value } = await waitForResult();

    console.log('tx id: ', transactionId);
    console.log('add_lock function logs: ',logs[0]);
    console.log('add_lock function result:', value);
  } catch (error) {
    console.error('Error calling add_lock function:', error);
  }
}

getWalletBalances().catch(console.error);


