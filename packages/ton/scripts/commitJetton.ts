import { Commit, CommitData, StringImpl, HashedTimeLockTON, dictValueParserStringImpl } from "../build/JettonPreHTLC/tact_HashedTimeLockTON"; 
import { getHttpEndpoint } from "@orbs-network/ton-access";
import { mnemonicToWalletKey } from "ton-crypto";
import { TonClient, WalletContractV4, Address, Cell, beginCell, Slice, Dictionary } from "@ton/ton";
import { toNano, sleep, createStrMap } from "../utils/utils";
import { TokenTransfer,JettonDefaultWallet } from "../build/SampleJetton/tact_JettonDefaultWallet";
import { Builder } from "../build/JettonPreHTLC/tact_HashedTimeLockTON";

export async function run() {
  const endpoint = await getHttpEndpoint({ network: "testnet" });
  const client = new TonClient({ endpoint });

  const mnemonic = "pretty electric october neck alley tiger action assault garlic divide oppose exist online cluster luxury clump kangaroo number away analyst attitude digital zebra world";
  const key = await mnemonicToWalletKey(mnemonic.split(" "));
  const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
  if (!await client.isContractDeployed(wallet.address)) {
    return console.log("Wallet is not deployed");
  }

  const walletContract = client.open(wallet);
  const walletSender = walletContract.sender(key.secretKey);
  const seqno = await walletContract.getSeqno();

  // const contractAddress = Address.parse("0:4d3b789f0240fa5f8577dcaef38447daf69320d6c5fe5130f53bd73ede06f808");
  const contractAddress = Address.parse("0:56d66cec0a70f81e6401e5529ba11eb73755c139e18e23666687b7af20375d0a");
  
  const newContract = JettonDefaultWallet.fromAddress(contractAddress);
  const contractProvider = client.open(newContract);

  // TokenTransfer details
  const queryId = BigInt(Date.now()); // Unique identifier for the transaction
  const amount = 1n; // Amount to transfer, here it's 1 TON
  const destination = Address.parse("EQCZXgTwgXzzH0sFJFVpk-rLY3Hlxpl95KRCfzUK_X_D0V2c"); // Recipient address
  const response_destination = Address.parse("kQAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B9D3"); // Address to receive response, usually the sender's wallet
  const custom_payload: Cell | null = beginCell().storeInt(0,32).storeStringTail("Success").endCell(); // Optional custom payload
  const forward_ton_amount = toNano("0.1"); // TONs to forward with the payload

const hopChains = createStrMap([
    [0n, { $$type: 'StringImpl', data: "chain 1" }],
    [1n, { $$type: 'StringImpl', data: "chain 2" }],
    [2n, { $$type: 'StringImpl', data: "chain 3" }]
  ]);
  
  const hopAssets = createStrMap([
    [0n, { $$type: 'StringImpl', data: "asset 1" }],
    [1n, { $$type: 'StringImpl', data: "asset 2" }],
    [2n, { $$type: 'StringImpl', data: "asset 3" }]
  ]);
  
  const hopAddresses = createStrMap([
    [0n, { $$type: 'StringImpl', data: "address 1" }],
    [1n, { $$type: 'StringImpl', data: "address 2" }],
    [2n, { $$type: 'StringImpl', data: "address 3" }]
  ]);
  
  const dstChain: string = "STARKNET SEPOLIA";
  const dstAsset: string = "STARKNET SEPOLIA";
  const dstAddress: string = "0x0430a74277723D1EBba7119339F0F8276ca946c1B2c73DE7636Fd9EBA31e1c1f";
  const srcAsset: string = "TON";
  const srcReceiver: Address = Address.parse("0QBdIYx_26bIOerW5uWXaQOahyxZE9GxjySpOiXoIPUaGrPB");
  const timelock = BigInt(Math.floor(Date.now() / 1000) + 3600); 
  const messenger: Address = Address.parse("EQBIgdusaVOdJbcN9r0O65iCF7KH9aUzS8kK-pDGJKs4ZHc_");
  
  // Sample Jetton-related data
  const jettonMasterAddress = beginCell().storeAddress(Address.parse("kQDAChK6XPuYj0GKB9bQdwG2MpwSgVzMZA_2X3E2jHZ2f1ah")).endCell();
  const jettonWalletCode = Cell.fromBase64('te6cckECIgEACCQAART/APSkE/S88sgLAQIBYgITA3rQAdDTAwFxsKMB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFRQUwNvBPhhAvhi2zxVEts88uCCHAMSAu4BjluAINchcCHXScIflTAg1wsf3iCCEBeNRRm6jhow0x8BghAXjUUZuvLggdM/+gBZbBIxE6ACf+CCEHvdl966jhnTHwGCEHvdl9668uCB0z/6AFlsEjEToAJ/4DB/4HAh10nCH5UwINcLH94gghAPin6luuMCIAQJAhAw2zxsF9s8fwUGAMbTHwGCEA+KfqW68uCB0z/6APpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHSAAGR1JJtAeL6AFFmFhUUQzAEijL4QW8kgRFNU8PHBfL0VHMhI9s8RDBSRNs8oIIJycOAAaCBED8BggiYloC2CBK88vRRhKGCAPX8IcL/8vT4Q1Qgdds8XA4OFgcCwnBZyHABywFzAcsBcAHLABLMzMn5AMhyAcsBcAHLABLKB8v/ydAg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIUHZwgEBwLEgTUOfIVVDbPMkQVl4iEDkCEDYQNRA02zwIEACqghAXjUUZUAfLHxXLP1AD+gIBINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgH6AgHPFgPsghAXjUUZuo8IMNs8bBbbPH/gghBZXwe8uo7Y0x8BghBZXwe8uvLggdM/+gD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgUQzBsFNs8f+AwcAoLDQCy0x8BghAXjUUZuvLggdM/+gD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB+gBRVRUUQzAE9vhBbyRToscFs47T+ENTuNs8AYIAptQCcFnIcAHLAXMBywFwAcsAEszMyfkAyHIBywFwAcsAEsoHy//J0CDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IhSQMcF8vTeUcigggD1/CHC//L0QLor2zwQNEvN2zxRo6FQChYfDgwC9qEiwgCOynNwKEgTUHTIVTCCEHNi0JxQBcsfE8s/AfoCASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgHPFsknRhRQVRRDMG1t2zwBlBA1bEHiIW6zjptwA8gBghDVMnbbWMsfyz/JQTByECRDAG1t2zySXwPiARAQAnpb+EFvJIERTVODxwXy9FGEoYIA9fwhwv/y9EMwUjnbPIIAqZ4BggkxLQCgggiYloCgErzy9HCAQAN/VDNmDg8AZGwx+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiDD6ADFx1yH6ADH6ADCnA6sAAdLIVTCCEHvdl95QBcsfE8s/AfoCASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgEgbpUwcAHLAY4eINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8W4skkRBRQMxRDMG1t2zwQAcrIcQHKAVAHAcoAcAHKAlAFINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WUAP6AnABymgjbrORf5MkbrPilzMzAXABygDjDSFus5x/AcoAASBu8tCAAcyVMXABygDiyQH7ABEAmH8BygDIcAHKAHABygAkbrOdfwHKAAQgbvLQgFAEzJY0A3ABygDiJG6znX8BygAEIG7y0IBQBMyWNANwAcoA4nABygACfwHKAALJWMwApsj4QwHMfwHKAFUgUCOBAQHPAAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYBINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8Wye1UAgEgFBcCEb/YFtnm2eNhpBwVARj4Q1MS2zwwVGMwUjAWANoC0PQEMG0BggDYrwGAEPQPb6Hy4IcBggDYryICgBD0F8gByPQAyQHMcAHKAEADWSDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJAgEgGBkAubu9GCcFzsPV0srnsehOw51kqFG2aCcJ3WNS0rZHyzItOvLf3xYjmCcCBVwBuAZ2OUzlg6rkclssOCcJ2XTlqzTstzOg6WbZRm6KSCcJ3R4APls2A8n8g6slmsohOAIBSBohAgN4oBsgAhO5LbPFUC2zxsMYHB8BwO1E0NQB+GPSAAGOSIEBAdcA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAH6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIQzBsE+D4KNcLCoMJuvLgiR0BivpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiBIC0QHbPB4ABHACACz4J28QIaGCCJiWgGa2CKGCCJiWgKChAA+77tRNDSAAGAB1sm7jQ1aXBmczovL1FtY0VveEJXd1N6M3hjZ2czc0VVZXNHcm5ieU5SdWZkaVp1TXlrOEg5a21WMTWCDjr7a3');
  
  let b_0 = new Builder();
  b_0.storeDict(hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
  b_0.storeDict(hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
  b_0.storeDict(hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
  let b_1 = new Builder();
  b_1.storeStringRefTail(dstChain);
  b_1.storeStringRefTail(dstAsset);
  b_1.storeStringRefTail(dstAddress);
  let b_2 = new Builder();
  b_2.storeStringRefTail(srcAsset);
  b_2.storeAddress(srcReceiver);
  b_2.storeInt(timelock, 257);
  b_2.storeAddress(messenger);
  b_2.storeRef(jettonMasterAddress);
  b_2.storeRef(jettonWalletCode);
  let b_3 = new Builder();
  b_3.storeInt(amount, 257);
  b_2.storeRef(b_3.endCell());
  b_1.storeRef(b_2.endCell());
  b_0.storeRef(b_1.endCell());
  
  const forward_payload = beginCell().storeUint(1, 1).storeRef(beginCell().storeUint(1734998782, 32).storeBuilder(b_0).endCell()).endCell();

  const tokenTransferMessage: TokenTransfer = {
    $$type: 'TokenTransfer',
    queryId,
    amount,
    destination,
    response_destination,
    custom_payload,
    forward_ton_amount,
    forward_payload,
  };

  console.log("Sending TokenTransfer message...");
  await contractProvider.send(walletSender, { value: toNano("0.2"), bounce: true }, tokenTransferMessage);

  let currentSeqno = seqno;
  while (currentSeqno == seqno) {
    console.log("Waiting for transaction to confirm...");
    await sleep(1500);
    currentSeqno = await walletContract.getSeqno();
  }
  console.log("Transaction confirmed!");
}

run().catch(console.error);









// async function run() {
//   const endpoint = await getHttpEndpoint({ network: "testnet" });
//   const client = new TonClient({ endpoint });

//   const mnemonic = "thunder ignore ankle edit height leader drip motor leave expect dune online favorite ankle tail spoon detail glory flush inform estate field swear reason"; 
//   const key = await mnemonicToWalletKey(mnemonic.split(" "));
//   const wallet = WalletContractV4.create({ publicKey: key.publicKey, workchain: 0 });
//   if (!await client.isContractDeployed(wallet.address)) {
//     return console.log("Wallet is not deployed");
//   }

//   const walletContract = client.open(wallet);
//   const walletSender = walletContract.sender(key.secretKey);
//   const seqno = await walletContract.getSeqno();

//   const contractAddress = Address.parse("EQBVGEJQIO5_tI4QuFOfWznCwC6kTMcMAUQAuelhX4pp9BxU"); 
//   const newContract = HashedTimeLockTON.fromAddress(contractAddress);
//   const contractProvider = client.open(newContract);


// //   const stack: TupleItem[] = []; // Ensure stack is correctly typed

// //   const details = await client.callGetMethod(
// //     Address.parse("EQDAChK6XPuYj0GKB9bQdwG2MpwSgVzMZA_2X3E2jHZ2f-0r"),
// //     "get_jetton_data",
// //     stack
// //   );
// //   let pablo:TupleReader = (details.stack.items);

// //  console.log(pablo);

//   const commitData: CommitData = {
//     hopChains: hopChains,
//     hopAssets: hopAssets,
//     hopAddresses: hopAddresses,
//     dstChain: dstChain,
//     dstAsset: dstAsset,
//     dstAddress: dstAddress,
//     srcAsset: srcAsset,
//     srcReceiver: srcReceiver,
//     timelock: timelock,
//     messenger: messenger,
//     jettonMasterAddress: jettonMasterAddress,
//     jettonWalletCode: jettonWalletCode,
//     amount: amount,
//     $$type: "CommitData"
//   };

//   const commitMessage: Commit = {
//     $$type: "Commit",
//     data: commitData
//   };

//   console.log("Sending Commit message...");
//   await contractProvider.send(walletSender, { value: amount, bounce: true }, commitMessage);

//   let currentSeqno = seqno;
//   while (currentSeqno == seqno) {
//     console.log("Waiting for transaction to confirm...");
//     await sleep(1500);
//     currentSeqno = await walletContract.getSeqno();
//   }
//   console.log("Transaction confirmed!");
// }

// run().catch(console.error);

