const { ethers } = require('hardhat');
const { assert, expect } = require('chai');
const { parseUnits } = require('@ethersproject/units');
const { txLoggedArgs, nowSeconds,sha256,random32,newSecretHashPair } = require('./helper/utils');

describe("HashedTimeLockEther", function () {
  let contract;
  let futureTime;
  let pastTime;
  let oneFinney;
  let zeroFinney;
  let accounts;

  beforeEach(async function () {
    const Contract = await ethers.getContractFactory("HashedTimeLockEther");
    contract = await Contract.deploy();
    pastTime = nowSeconds() - 300;
    futureTime = nowSeconds() + 60*60;
    accounts = await hre.ethers.getSigners();
    provider = hre.ethers.provider;
    oneFinney = parseUnits('1').toString();
    zeroFinney = parseUnits('0').toString();
  });

  it('createP() should create a new PHTLC and store correct details', async () => {
    const sender = accounts[0];
    const receiver = accounts[1];
    const chainIds = [1];
    const dstAddresses = [receiver.address];

    const tx = await contract.connect(sender).createP(
      chainIds,
      dstAddresses,
      1,
      100,
      receiver.address, 
      1,
      receiver.address,
      futureTime,
      accounts[2].address,
      { value: oneFinney }
    );

    const receipt = await tx.wait();
    const eventArgs = txLoggedArgs(receipt);

    assert.equal(eventArgs[0][0], 1, 'Chain ID does not match');
    assert.equal(eventArgs[1][0], receiver.address, 'Destination address does not match');
    assert.equal(eventArgs[2], 1, 'PHTLC ID does not match');
    assert.equal(eventArgs[3], 1, 'Source Asset ID does not match');
    assert.equal(eventArgs[4], 100, 'Destination Chain ID does not match');
    assert.equal(eventArgs[5], receiver.address, 'Source address does not match');
    assert.equal(eventArgs[6], 1, 'Amount does not match');
    assert.equal(eventArgs[7], receiver.address, 'Source address does not match');
    assert.equal(eventArgs[8], futureTime, 'Timelock does not match');
    assert.equal(eventArgs[9], accounts[2].address, 'Messenger address does not match');
    assert.equal(eventArgs[10].toString(), oneFinney, 'ETH amount does not match');
    assert.isFalse(eventArgs[11], 'Refunded should be false');
    assert.isFalse(eventArgs[12], 'Converted should be false');
  });

  it('createP() should fail when no ETH sent', async function () {
    const sender = accounts[0];
    const receiver = accounts[1];
    const chainIds = [1];
    const dstAddresses = [receiver.address];

    await expect(
      contract.connect(sender).createP(
        chainIds,
        dstAddresses,
        1,
        100,
        receiver.address,
        1,
        receiver.address,
        futureTime,
        accounts[2].address,
        { value: zeroFinney }
      )
    ).to.be.revertedWithCustomError(contract, 'FundsNotSent');
  });

  it('createP() should fail with timelocks in the past', async function () {
    const sender = accounts[0];
    const receiver = accounts[1];
    const chainIds = [1];
    const dstAddresses = [receiver.address];

    await expect(
      contract.connect(sender).createP(
        chainIds,
        dstAddresses,
        1,
        100,
        receiver.address,
        1,
        receiver.address,
        pastTime,
        accounts[2].address,
        { value: oneFinney }
      )
    ).to.be.revertedWithCustomError(contract, 'NotFutureTimelock');
  });
  
  it('refundP() should fail if timelock has not passed', async function () {
    const sender = accounts[0];
    const receiver = accounts[1];
    const chainIds = [1];
    const dstAddresses = [receiver.address];
  
    const txSend = await contract.connect(sender).createP(
      chainIds,
      dstAddresses,
      1,
      100,
      receiver.address, 
      1,
      receiver.address,
      futureTime ,
      accounts[2].address,
      { value: oneFinney }
    );
  
    const receiptSend = await txSend.wait();
    const eventArgs = txLoggedArgs(receiptSend);
    const phtlcID = eventArgs[0][0];
  
    await expect(
      contract.connect(sender).refundP(phtlcID)
    ).to.be.revertedWithCustomError(contract, 'NotPassedTimelock');
    });
  
    
  it('refundP() should successfully refund a PHTLC after timelock has passed', async function () {
    const sender = accounts[0];
    const receiver = accounts[1];
    const chainIds = [1];
    const dstAddresses = [receiver.address];

    const txSend = await contract.connect(sender).createP(
      chainIds,
      dstAddresses,
      1,
      100,
      receiver.address, 
      1,
      receiver.address,
      futureTime,
      accounts[2].address,
      { value: oneFinney }
    );

    const receiptSend = await txSend.wait();
    const eventArgs = txLoggedArgs(receiptSend);
    const phtlcID = eventArgs[0][0];

    await ethers.provider.send("evm_increaseTime", [futureTime + 10]); 
    await ethers.provider.send("evm_mine");

    const senderBalanceBefore = await provider.getBalance(sender.address);
    const tx = await contract.connect(sender).refundP(phtlcID);
    const receipt = await tx.wait();

    const gasUsed = BigInt(receipt.gasUsed);
    const gasPrice = receipt.effectiveGasPrice ? BigInt(receipt.effectiveGasPrice) : BigInt(receipt.gasPrice); 
    const gasCost = gasUsed * gasPrice;

    await expect(tx).to.emit(contract, "EtherTransferRefundedP").withArgs(phtlcID);

    const senderBalanceAfter = await provider.getBalance(sender.address);
    assert.equal(
      senderBalanceAfter.toString(),
      senderBalanceBefore + (BigInt(oneFinney)) - (gasCost),
      "Refund amount does not match"
    );
    await ethers.provider.send("evm_increaseTime", [-futureTime - 10]); 
    await ethers.provider.send("evm_mine");
  });

  it('create() should successfully create a new HTLC with a valid messenger', async function () {
    const sender = accounts[0];
    const srcAddress = accounts[1].address;
    const hashlock = newSecretHashPair().hash;
    const futureTime = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
    const chainID = 1;
    const targetCurrencyReceiverAddress = "targetAddress";
    const phtlcID = 1;
    const messenger = ("0xB7f8B2512EDE20Ede93C53552b8b2715A9648D75"); //valid IMessenger contract address

    const tx = await contract.connect(sender).create(
        srcAddress,
        hashlock,
        futureTime,
        chainID,
        targetCurrencyReceiverAddress,
        phtlcID,
        messenger,
        { value: oneFinney }
    );

    const receipt = await tx.wait();
    const eventArgs = txLoggedArgs(receipt);
    await expect(tx).to.emit(contract, "EtherTransferInitiated");

    expect(eventArgs[0]).to.equal(hashlock, 'Hashlock does not match');
    expect(eventArgs[1].toString()).to.equal(oneFinney.toString(), 'Amount does not match');
    expect(eventArgs[2]).to.equal(chainID, 'Chain ID does not match');
    expect(eventArgs[3]).to.equal(futureTime, 'Timelock does not match');
    expect(eventArgs[4]).to.equal(sender.address, 'Sender does not match');
    expect(eventArgs[5]).to.equal(srcAddress, 'Source address does not match');
    expect(eventArgs[6]).to.equal(targetCurrencyReceiverAddress, 'Target currency receiver address does not match');
    expect(eventArgs[7]).to.equal(phtlcID, 'PHTLC ID does not match');
});

it('create() should successfully create a new HTLC without a messenger', async function () {
  const sender = accounts[0];
  const srcAddress = accounts[1].address;
  const hashlock = newSecretHashPair().hash;
  const futureTime = Math.floor(Date.now() / 1000) + 3600; 
  const chainID = 1;
  const targetCurrencyReceiverAddress = "targetAddress";
  const phtlcID = 1;

  const tx = await contract.connect(sender).create(
      srcAddress,
      hashlock,
      futureTime,
      chainID,
      targetCurrencyReceiverAddress,
      phtlcID,
      "0x0000000000000000000000000000000000000000", // No nessenger
      { value: oneFinney }
  );

  const receipt = await tx.wait();
  const eventArgs = txLoggedArgs(receipt);

  expect(eventArgs[0]).to.equal(hashlock, 'Hashlock does not match');
  expect(eventArgs[1].toString()).to.equal(oneFinney.toString(), 'Amount does not match');
  expect(eventArgs[2]).to.equal(chainID, 'Chain ID does not match');
  expect(eventArgs[3]).to.equal(futureTime, 'Timelock does not match');
  expect(eventArgs[4]).to.equal(sender.address, 'Sender does not match');
  expect(eventArgs[5]).to.equal(srcAddress, 'Source address does not match');
  expect(eventArgs[6]).to.equal(targetCurrencyReceiverAddress, 'Target currency receiver address does not match');
  expect(eventArgs[7]).to.equal(phtlcID, 'PHTLC ID does not match');
});



  it('create() should fail when no ETH is sent', async function () {
    const sender = accounts[0];
    const srcAddress = accounts[1].address;
    const hashlock = newSecretHashPair().hash;
    const chainID = 1;
    const targetCurrencyReceiverAddress = "targetAddress";
    const phtlcID = 1;
    const messenger = accounts[2].address;

    await expect(
      contract.connect(sender).create(
        srcAddress,
        hashlock,
        futureTime,
        chainID,
        targetCurrencyReceiverAddress,
        phtlcID,
        messenger,
        { value: 0 }
      )
    ).to.be.revertedWithCustomError(contract, 'FundsNotSent');
  });

  it('create() should fail if the timelock is not in the future', async function () {
    const sender = accounts[0];
    const srcAddress = accounts[1].address;
    const hashlock = sha256('secret');
    const pastTime = Math.floor(Date.now() / 1000) - 3600; 
    const chainID = 1;
    const targetCurrencyReceiverAddress = "targetAddress";
    const phtlcID = 1;
    const messenger = ("0xB7f8B2512EDE20Ede93C53552b8b2715A9648D75"); //valid IMessenger contract address

    await expect(contract.connect(sender).create(
        srcAddress,
        hashlock,
        pastTime,
        chainID,
        targetCurrencyReceiverAddress,
        phtlcID,
        messenger,
        { value: oneFinney }
    )).to.be.revertedWithCustomError(contract,"NotFutureTimelock");
});

it('create() should fail if an HTLC with the same hashlock already exists', async function () {
  const sender = accounts[0];
  const srcAddress = accounts[1].address;
  const hashlock = sha256('secret');
  const futureTime = Math.floor(Date.now() / 1000) + 3600; 
  const chainID = 1;
  const targetCurrencyReceiverAddress = "targetAddress";
  const phtlcID = 1;
  const messenger = ("0xB7f8B2512EDE20Ede93C53552b8b2715A9648D75"); //valid IMessenger contract address

  await contract.connect(sender).create(
      srcAddress,
      hashlock,
      futureTime,
      chainID,
      targetCurrencyReceiverAddress,
      phtlcID,
      messenger,
      { value: oneFinney }
  );

  await expect(contract.connect(sender).create(
      srcAddress,
      hashlock,
      futureTime,
      chainID,
      targetCurrencyReceiverAddress,
      phtlcID,
      messenger,
      { value: oneFinney }
  )).to.be.revertedWithCustomError(contract,"ContractAlreadyExist");
});

it('convertP() should successfully convert by sender', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const chainIds = [1];
  const dstAddresses = [receiver.address];
  const hashlock = newSecretHashPair().hash;

  const tx = await contract.connect(sender).createP(
    chainIds,
    dstAddresses,
    1,
    100,
    receiver.address, 
    1,
    receiver.address,
    futureTime,
    accounts[2].address,
    { value: oneFinney }
  );

  const receipt = await tx.wait();
  const eventArgs = txLoggedArgs(receipt);
  const phtlcid = eventArgs[2];
  const tx2 = await contract.connect(sender).convertP(phtlcid, hashlock);
  const receipt2 = await tx2.wait();

  const eventArgs2 = txLoggedArgs(receipt2);

  expect(eventArgs2[0]).to.equal(hashlock, 'Hashlock does not match');
  expect(eventArgs2[1].toString()).to.equal(oneFinney.toString(), 'Amount does not match');
  expect(eventArgs2[2]).to.equal(1, 'Source Asset ID does not match');
  expect(eventArgs2[3]).to.equal(futureTime, 'Timelock does not match');
  expect(eventArgs2[4]).to.equal(sender.address, 'Sender does not match');
  expect(eventArgs2[5]).to.equal(receiver.address, 'Source address does not match');
  expect(eventArgs2[6]).to.equal(receiver.address, 'Destination address does not match');
  expect(eventArgs2[7]).to.equal(phtlcid, 'PHTLC ID does not match');

  const pContract = await contract.getPHTLCDetails(phtlcid);
  expect(pContract.converted).to.be.true;

  const htlc = await contract.getHTLCDetails(hashlock);
  expect(htlc.sender).to.equal(sender.address);
  expect(htlc.amount.toString()).to.equal(oneFinney.toString());
});

it('convertP() should fail if called by an unauthorized user', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const unauthorized = accounts[3];
  const chainIds = [1];
  const dstAddresses = [receiver.address];
  const hashlock = newSecretHashPair().hash;

  const tx = await contract.connect(sender).createP(
    chainIds,
    dstAddresses,
    1,
    100,
    receiver.address,
    1,
    receiver.address,
    futureTime,
    accounts[2].address,
    { value: oneFinney }
  );

  const receipt = await tx.wait();
  const eventArgs = txLoggedArgs(receipt);
  const phtlcid = eventArgs[2];

  await expect(
    contract.connect(unauthorized).convertP(phtlcid, hashlock)
  ).to.be.revertedWithCustomError(contract, 'NoAllowance');
});

it('redeem() should successfully redeem with the correct secret', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashSecretpair = newSecretHashPair();
  const hashlock = hashSecretpair.hash;
  const secret = hashSecretpair.secret;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  const tx = await contract.connect(receiver).redeem(hashlock, secret);
  const receipt = await tx.wait();

  const eventArgs = txLoggedArgs(receipt);
  expect(eventArgs[0]).to.equal(hashlock, 'HTLC ID does not match');
  expect(eventArgs[1]).to.equal(receiver.address, 'Receiver address does not match');

  const htlc = await contract.getHTLCDetails(hashlock);
  expect(htlc.secret).to.equal(secret, 'Secret does not match');
  expect(htlc.redeemed).to.be.true;
});

it('redeem() should fail if the secret is incorrect', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashlock = newSecretHashPair().hash;
  const incorrectSecret = newSecretHashPair().secret;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  await expect(
    contract.connect(receiver).redeem(hashlock, incorrectSecret)
  ).to.be.revertedWithCustomError(contract, 'HashlockNotMatch');
});

it('redeem() should fail if the HTLC is already refunded', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashSecretpair = newSecretHashPair();
  const hashlock = hashSecretpair.hash;
  const secret = hashSecretpair.secret;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );
  await ethers.provider.send("evm_increaseTime", [futureTime + 10]); 
  await ethers.provider.send("evm_mine");

  await contract.connect(sender).refund(hashlock);

  await expect(
    contract.connect(receiver).redeem(hashlock, secret)
  ).to.be.revertedWithCustomError(contract, 'AlreadyRefunded');

  await ethers.provider.send("evm_increaseTime", [-futureTime - 10]); 
  await ethers.provider.send("evm_mine");
});

it('redeem() should fail if the HTLC is already redeemed', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashSecretpair = newSecretHashPair();
  const hashlock = hashSecretpair.hash;
  const secret = hashSecretpair.secret;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  await contract.connect(receiver).redeem(hashlock, secret);

  await expect(
    contract.connect(receiver).redeem(hashlock, secret)
  ).to.be.revertedWithCustomError(contract, 'AlreadyRedeemed');
});

it('refund() should successfully refund after the timelock has passed', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashlock = newSecretHashPair().hash;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  await ethers.provider.send("evm_increaseTime", [futureTime + 10]);
  await ethers.provider.send("evm_mine");

  const tx = await contract.connect(sender).refund(hashlock);
  const receipt = await tx.wait();

  const eventArgs = txLoggedArgs(receipt);
  expect(eventArgs[0]).to.equal(hashlock, 'HTLC ID does not match');

  const htlc = await contract.getHTLCDetails(hashlock);
  expect(htlc.refunded).to.be.true;

  await ethers.provider.send("evm_increaseTime", [-futureTime - 10]);
  await ethers.provider.send("evm_mine");
});

it('refund() should fail if the HTLC is already refunded', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashlock = newSecretHashPair().hash;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  await ethers.provider.send("evm_increaseTime", [futureTime + 10]);
  await ethers.provider.send("evm_mine");

  await contract.connect(sender).refund(hashlock);

  await expect(
    contract.connect(sender).refund(hashlock)
  ).to.be.revertedWithCustomError(contract, 'AlreadyRefunded');

  await ethers.provider.send("evm_increaseTime", [-futureTime - 10]);
  await ethers.provider.send("evm_mine");
});

it('refund() should fail if the HTLC is already redeemed', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashSecretpair = newSecretHashPair();
  const hashlock = hashSecretpair.hash;
  const secret = hashSecretpair.secret;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  await contract.connect(receiver).redeem(hashlock, secret);

  await ethers.provider.send("evm_increaseTime", [futureTime + 10]);
  await ethers.provider.send("evm_mine");

  await expect(
    contract.connect(sender).refund(hashlock)
  ).to.be.revertedWithCustomError(contract, 'AlreadyRedeemed');

  await ethers.provider.send("evm_increaseTime", [-futureTime - 10]);
  await ethers.provider.send("evm_mine");
});


it('refund() should fail if the timelock has not passed', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashlock = newSecretHashPair().hash;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  await expect(
    contract.connect(sender).refund(hashlock)
  ).to.be.revertedWithCustomError(contract, 'NotPassedTimelock');
});

it('getHTLCDetails() should return correct details for a valid HTLC', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const hashlock = newSecretHashPair().hash;

  await contract.connect(sender).create(
    receiver.address,
    hashlock,
    futureTime,
    1,
    "targetAddress",
    1,
    "0x0000000000000000000000000000000000000000", // No messenger
    { value: oneFinney }
  );

  const htlcDetails = await contract.getHTLCDetails(hashlock);

  expect(htlcDetails.hashlock).to.equal(hashlock, 'Hashlock does not match');
  expect(Number(htlcDetails.secret)).to.equal(0x0, 'Secret does not match');
  expect(htlcDetails.amount.toString()).to.equal(oneFinney, 'Amount does not match');
  expect(htlcDetails.timelock).to.equal(futureTime, 'Timelock does not match');
  expect(htlcDetails.sender).to.equal(sender.address, 'Sender does not match');
  expect(htlcDetails.srcAddress).to.equal(receiver.address, 'Source address does not match');
  expect(htlcDetails.redeemed).to.be.false;
  expect(htlcDetails.refunded).to.be.false;
});

it('getHTLCDetails() should return empty details for a non-existent HTLC', async function () {
  const nonExistentHashlock = newSecretHashPair().hash;

  const htlcDetails = await contract.getHTLCDetails(nonExistentHashlock);

  expect(Number(htlcDetails.hashlock)).to.equal(0x0, 'Hashlock does not match');
  expect(Number(htlcDetails.secret)).to.equal(0x0, 'Secret does not match');
  expect(htlcDetails.amount.toString()).to.equal('0', 'Amount does not match');
  expect(htlcDetails.timelock).to.equal(0, 'Timelock does not match');
  expect(htlcDetails.sender).to.equal("0x0000000000000000000000000000000000000000", 'Sender does not match');
  expect(htlcDetails.srcAddress).to.equal("0x0000000000000000000000000000000000000000", 'Source address does not match');
  expect(htlcDetails.redeemed).to.be.false;
  expect(htlcDetails.refunded).to.be.false;
});

it('getPHTLCDetails() should return correct details for a valid PHTLC', async function () {
  const sender = accounts[0];
  const receiver = accounts[1];
  const messenger = accounts[2];
  const dstAddress = receiver.address;
  const srcAssetId = 1;

  const tx = await contract.connect(sender).createP(
    [1], 
    [dstAddress], 
    11155111,
    100, 
    dstAddress, 
    srcAssetId, 
    receiver.address, 
    futureTime, 
    messenger.address, 
    { value: oneFinney }
  );

  const receipt = await tx.wait();
  const eventArgs = txLoggedArgs(receipt);
  const phtlcId = eventArgs[0][0];

  const phtlcDetails = await contract.getPHTLCDetails(phtlcId);

  expect(phtlcDetails.dstAddress).to.equal(dstAddress, 'Destination address does not match');
  expect(phtlcDetails.srcAssetId).to.equal(srcAssetId, 'Source Asset ID does not match');
  expect(phtlcDetails.sender).to.equal(sender.address, 'Sender address does not match');
  expect(phtlcDetails.srcAddress).to.equal(receiver.address, 'Source address does not match');
  expect(phtlcDetails.timelock).to.equal(futureTime, 'Timelock does not match');
  expect(phtlcDetails.messenger).to.equal(messenger.address, 'Messenger address does not match');
  expect(phtlcDetails.amount.toString()).to.equal(oneFinney, 'Amount does not match');
  expect(phtlcDetails.refunded).to.be.false;
  expect(phtlcDetails.converted).to.be.false;
});

it('getPHTLCDetails() should return empty details for a non-existent PHTLC', async function () {
  const nonExistentPHTLCId = 64; 

  const phtlcDetails = await contract.getPHTLCDetails(nonExistentPHTLCId);

  expect(phtlcDetails.dstAddress).to.equal("0", 'Destination address does not match');
  expect(phtlcDetails.srcAssetId).to.equal(0, 'Source Asset ID does not match');
  expect(phtlcDetails.sender).to.equal("0x0000000000000000000000000000000000000000", 'Sender address does not match');
  expect(phtlcDetails.srcAddress).to.equal("0x0000000000000000000000000000000000000000", 'Source address does not match');
  expect(phtlcDetails.timelock).to.equal(0, 'Timelock does not match');
  expect(phtlcDetails.messenger).to.equal("0x0000000000000000000000000000000000000000", 'Messenger address does not match');
  expect(phtlcDetails.amount).to.equal(0, 'Amount does not match');
  expect(phtlcDetails.refunded).to.be.false;
  expect(phtlcDetails.converted).to.be.false;
});

});

