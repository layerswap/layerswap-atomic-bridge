const { ethers } = require('hardhat');
const { assert } = require('chai');
const { BigNumber } = require('@ethersproject/bignumber');
const { expect } = require('chai');

const { assertEqualBN } = require('./helper/assert');
const {
  bufToStr,
  htlcERC20ArrayToObj,
  isSha256Hash,
  newSecretHashPair,
  nowSeconds,
  random32,
  txLoggedArgsWithIndex,
  sha256
} = require('./helper/utils');

// some testing data
const hourSeconds = 3600;
const timeLock1Hour = nowSeconds() + hourSeconds;
const tokenAmount = 10;
const senderInitialBalance = 1000;
const chainId = 1;
const _address = '0x0';
const depth = 2;

describe('HashedTimelockERC20', (accounts) => {
  let HashedTimelock;
  let TestToken;
  let htlc;
  let token;
  let sender;
  let receiver;
  let hashPair;

  const assertTokenBal = async (addr, tokenAmount, msg) =>
    assertEqualBN(await token.balanceOf.call(addr), tokenAmount, msg ? msg : 'wrong token balance');

  before(async () => {
    HashedTimelock = await ethers.getContractFactory('HashedTimelockERC20');
    htlc = await HashedTimelock.deploy();

    TestToken = await ethers.getContractFactory('TestToken');
    token = await TestToken.deploy();

    accounts = await ethers.getSigners();
    sender = accounts[0];
    receiver = accounts[1];

    await token.mint(sender.address, senderInitialBalance);
  });

  it('newContract() should create new contract and store correct details', async () => {
    hashPair = newSecretHashPair();
    await token.connect(sender).approve(htlc, senderInitialBalance);
    const txReceipt = await htlc
      .connect(sender)
      .createHTLC(receiver.address, hashPair.hash, timeLock1Hour, token.target, tokenAmount, chainId, _address,depth);
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);

    const contractId = logArgs.contractId;

    assert(isSha256Hash(contractId));

    // check token balances
    assertTokenBal(sender.address, senderInitialBalance - tokenAmount);
    assertTokenBal(htlc.address, tokenAmount);

    assert(isSha256Hash(contractId));

    assert.equal(logArgs.sender, sender.address);
    assert.equal(logArgs.receiver, receiver.address);
    assert.equal(logArgs.tokenContract, token.target);
    assert.equal(logArgs.amount.toString(), tokenAmount);
    assert.equal(logArgs.hashlock, hashPair.hash);
    assert.equal(logArgs.timelock, timeLock1Hour);
    assert.equal(logArgs.depth, depth);


    // // check htlc record
    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcERC20ArrayToObj(contractArr);
    assert.equal(contract.sender, sender.address);
    assert.equal(contract.receiver, receiver.address);
    assert.equal(contract.token, token.target);
    assert.equal(contract.amount.toString(), tokenAmount);
    assert.equal(contract.hashlock, hashPair.hash);
    assert.equal(contract.timelock, timeLock1Hour);
    assert.isFalse(contract.withdrawn);
    assert.isFalse(contract.refunded);
    assert.equal(contract.preimage, '0x0000000000000000000000000000000000000000000000000000000000000000');
  });

  it('newContract() should fail when no token transfer approved', async () => {
    await token.approve(htlc.target, 0, { from: sender }); // ensure 0
    await newContractExpectFailure('ERC20InsufficientAllowance');
  });

  it('newContract() should fail when token amount is 0', async () => {
    await newContractExpectFailure('FundsNotSent', {
      amount: 0,
    });
  });

  it('newContract() should fail when tokens approved for some random account', async () => {
    // approve htlc for different account to the htlc contract
    await token.approve(htlc.target, 0, { from: sender }); // ensure 0
    await token.approve(accounts[9].address, tokenAmount, { from: sender });
    await newContractExpectFailure('ERC20InsufficientAllowance');
  });

  it('newContract() should fail when the timelock is in the past', async () => {
    const pastTimelock = nowSeconds() - 2;
    await token.approve(htlc.target, tokenAmount, { from: sender });
    await newContractExpectFailure('NotFutureTimelock', { timelock: pastTimelock });
  });

  it('newContract() should reject a duplicate contract request', async () => {
    const hashlock = newSecretHashPair().hash;
    const timelock = timeLock1Hour + 5;
    const balBefore = BigNumber.from(await token.balanceOf(htlc.target));

    await newContract({ hashlock: hashlock, timelock: timelock });
    assertTokenBal(htlc.address, tokenAmount);

    const balAfter = balBefore.add(tokenAmount);

    assertTokenBal(htlc.address, balAfter, 'tokens not transfered to htlc contract');

    await token.approve(htlc.target, tokenAmount + 100, { from: sender });
    // now attempt to create another with the exact same parameters
    await newContractExpectFailure('ContractAlreadyExist', {
      timelock: timelock,
      hashlock: hashlock,
    });
  });

  it('redeem() should send receiver funds when given the correct secret preimage', async () => {
    const hashPair = newSecretHashPair();
    receiver = accounts[1];

    const txReceipt = await newContract({ hashlock: hashPair.hash });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    // receiver calls redeem with the secret to claim the tokens
    await htlc.connect(receiver).redeem(contractId, hashPair.secret);

    // Check tokens now owned by the receiver
    assertTokenBal(receiver.address, tokenAmount, `receiver doesn't own ${tokenAmount} tokens`);

    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcERC20ArrayToObj(contractArr);
    assert.isTrue(contract.withdrawn); // withdrawn set
    assert.isFalse(contract.refunded); // refunded still false
    assert.equal(contract.preimage, hashPair.secret);
  });

  it('redeem() should fail if preimage does not hash to hashX', async () => {
    const txReceipt = await newContract({});
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    // receiver calls redeem with an invalid secret
    const wrongSecret = bufToStr(random32());
    try {
      await htlc.connect(receiver).redeem(contractId, wrongSecret);
      assert.fail('expected failure due to 0 value transferred');
    } catch (error) {
      assert.include(error.message, 'HashlockNotMatch');
    }
  });

  it('redeem() should send receiver funds when caller is not the receiver', async () => {
    const hashPair = newSecretHashPair();
    receiver = accounts[1];

    const txReceipt = await newContract({ hashlock: hashPair.hash });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    const someGuy = accounts[4];
    // receiver calls redeem with the secret to claim the tokens
    await htlc.connect(someGuy).redeem(contractId, hashPair.secret);

    // Check tokens now owned by the receiver
    assertTokenBal(receiver.address, tokenAmount, `receiver doesn't own ${tokenAmount} tokens`);

    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcERC20ArrayToObj(contractArr);
    assert.isTrue(contract.withdrawn); // withdrawn set
    assert.isFalse(contract.refunded); // refunded still false
    assert.equal(contract.preimage, hashPair.secret);
  });

  it('redeem() should fail after timelock expiry', async () => {
    const hashPair = newSecretHashPair();
    const timelock20Seconds = (await ethers.provider.getBlock('latest')).timestamp + 20;
    await token.approve(htlc.target, tokenAmount, { from: sender });

    const txReceipt = await newContract({
      hashlock: hashPair.hash,
      timelock: timelock20Seconds,
    });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    await ethers.provider.send('evm_increaseTime', [21]); // Increase time by 21 seconds

    try {
      await htlc.connect(receiver).redeem(contractId, hashPair.secret);
      assert.fail('Transaction did not revert as expected');
    } catch (error) {
      assert.include(error.message, 'NotFutureTimelock');
    }
  });

  it('batchRedeem() should send receiver funds when given the correct secret preimage', async () => {
    const hashPair1 = newSecretHashPair();
    const hashPair2 = newSecretHashPair();
    receiver = accounts[1];
    const sender2 = accounts[2];

    await token.connect(sender).approve(htlc.target, senderInitialBalance);

    const txReceipt1 = await htlc
      .connect(sender)
      .createHTLC(receiver.address, hashPair1.hash, timeLock1Hour, token.target, tokenAmount, chainId, _address,depth);
    const txReceiptWithEvents1 = await txReceipt1.wait();
    const logArgs1 = txLoggedArgsWithIndex(txReceiptWithEvents1, 1);
    const contractId1 = logArgs1.contractId;

    await token.mint(sender2.address, senderInitialBalance);
    await token.connect(sender2).approve(htlc.target, senderInitialBalance);

    const txReceipt2 = await htlc
      .connect(sender2)
      .createHTLC(receiver.address, hashPair2.hash, timeLock1Hour, token.target, tokenAmount, chainId, _address,depth);
    const txReceiptWithEvents2 = await txReceipt2.wait();
    const logArgs2 = txLoggedArgsWithIndex(txReceiptWithEvents2, 1);
    const contractId2 = logArgs2.contractId;

    // receiver calls redeem with the secret to claim the tokens
    await htlc.connect(receiver).batchRedeem([contractId1, contractId2], [hashPair1.secret, hashPair2.secret]);

    // Check tokens now owned by the receiver
    assertTokenBal(receiver.address, tokenAmount * 2, `receiver doesn't own ${tokenAmount * 2} tokens`);

    const contractArr1 = await htlc.getHTLCDetails(contractId1);
    const contract1 = htlcERC20ArrayToObj(contractArr1);
    assert.isTrue(contract1.withdrawn); // withdrawn set
    assert.isFalse(contract1.refunded); // refunded still false
    assert.equal(contract1.preimage, hashPair1.secret);

    const contractArr2 = await htlc.getHTLCDetails(contractId2);
    const contract2 = htlcERC20ArrayToObj(contractArr2);
    assert.isTrue(contract2.withdrawn); // withdrawn set
    assert.isFalse(contract2.refunded); // refunded still false
    assert.equal(contract2.preimage, hashPair2.secret);
  });

  it('refund() should pass after timelock expiry', async () => {
    const hashPair = newSecretHashPair();
    const timelock20Seconds = (await ethers.provider.getBlock('latest')).timestamp + 20;

    await token.approve(htlc.target, tokenAmount, { from: sender });
    const txReceipt = await newContract({
      timelock: timelock20Seconds,
      hashlock: hashPair.hash,
    });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    await ethers.provider.send('evm_increaseTime', [30]); // Increase time by 30 seconds
    // const balBefore = await token.balanceOf(sender);
    const balBefore = BigNumber.from(await token.balanceOf(sender.address));
    await htlc.connect(sender).refund(contractId);

    // Check tokens returned to the sender
    assertTokenBal((sender.address, balBefore.add(tokenAmount)), `sender balance unexpected`);
    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcERC20ArrayToObj(contractArr);
    assert.isTrue(contract.refunded);
    assert.isFalse(contract.withdrawn);
  });

  it('refund() should fail before the timelock expiry', async () => {
    await token.approve(htlc.target, tokenAmount, { from: sender });
    const newContractTx = await newContract();
    const txReceiptWithEvents = await newContractTx.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    try {
      await htlc.refund(contractId, { from: sender });
      assert.fail('expected failure due to timelock');
    } catch (err) {
      assert.include(err.message, 'NotPassedTimelock');
    }
  });

  it('redeem() should fail after refund', async () => {
    const hashPair1 = newSecretHashPair();
    const hashPair2 = newSecretHashPair();
    const timelock20Seconds = (await ethers.provider.getBlock('latest')).timestamp + 20;

    await token.approve(htlc.target, tokenAmount * 2, { from: sender });
    const newContractTx1 = await newContract({
      timelock: timelock20Seconds,
      hashlock: hashPair1.hash,
    });
    const txReceiptWithEvents = await newContractTx1.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId1 = logArgs.contractId;
    // create a second contract so there is double the tokens held by the HTLC
    await newContract({
      timelock: timelock20Seconds,
      hashlock: hashPair2.hash,
    });
    await ethers.provider.send('evm_increaseTime', [30]); // Increase time by 30 seconds

    await htlc.refund(contractId1, { from: sender });
    try {
      await htlc.connect(receiver).redeem(contractId1, hashPair1.secret);
      assert.fail('expected failure as already refunded');
    } catch (err) {
      assert.include(err.message, 'AlreadyRefunded');
    }
  });

  it("getHTLCDetails() returns empty record when contract doesn't exist", async function () {
    // Use a placeholder address for a non-existent contract
    const nonExistentContractId = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const contract = await htlc.getHTLCDetails(nonExistentContractId);
    expect(Number(contract[0])).to.equal(0);
  });

  /*
   * Helper for newContract() calls, does the ERC20 approve before calling
   */
  const newContract = async ({ timelock = timeLock1Hour, hashlock = newSecretHashPair().hash } = {}) => {
    // await token.approve(htlc.address, tokenAmount, { from: sender });
    return htlc.createHTLC(receiver.address, hashlock, timelock, token.target, tokenAmount, chainId, _address,depth, {
      from: sender,
    });
  };

  const newContractExpectFailure = async (
    shouldFailMsg,
    {
      receiverAddr = receiver.address,
      amount = tokenAmount,
      timelock = timeLock1Hour,
      hashlock = newSecretHashPair().hash,
    } = {}
  ) => {
    try {
      await htlc.createHTLC(receiverAddr, hashlock, timelock, token.target, amount, chainId, _address,depth, {
        from: sender,
      });
      assert.fail('Transaction did not revert as expected');
    } catch (error) {
      assert.include(error.message, shouldFailMsg);
    }
  };


  it('redeem() should send receiver funds when given the correct secret preimage', async () => {
    const secret = (random32());
    receiver = accounts[3];
    const newDepth = 5;
    let result = secret; 

    for (let i = 0; i < newDepth; i++) {
      result = (sha256(result)); 
    }

    const newHashlock = (result); 

    const txReceipt = await htlc
    .connect(accounts[2])
    .createHTLC(receiver, newHashlock, timeLock1Hour, token.target, tokenAmount, chainId, _address, newDepth);
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    // receiver calls redeem with the secret to claim the tokens
    await htlc.connect(receiver).redeem(contractId, secret);

    // Check tokens now owned by the receiver
    assertTokenBal(receiver, tokenAmount, `receiver doesn't own ${tokenAmount} tokens`);

    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcERC20ArrayToObj(contractArr);
    assert.isTrue(contract.withdrawn); // withdrawn set
    assert.isFalse(contract.refunded); // refunded still false
    assert.equal(contract.preimage, bufToStr(secret));
  });



  it('should not allow redeeming if depth is incorrect', async () => {
    const secret = (random32());
    receiver = accounts[3];
    const newDepth = 5;
    let result = secret; 

    for (let i = 0; i < newDepth; i++) {
      result = (sha256(result)); 
    }

    const newHashlock = (result); 

    const txReceipt = await htlc
    .connect(accounts[2])
    .createHTLC(receiver, newHashlock, timeLock1Hour, token.target, tokenAmount, chainId, _address, newDepth + 3);
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    await expect(htlc.connect(receiver).redeem(contractId, secret)).to.be.reverted;
  });

  it('batchRedeem() should send receiver funds when given the correct secret preimage.Varying depths case', async () => {
    const secret = random32();
    receiver = accounts[1];
    const sender1 = accounts[3];
    const sender2 = accounts[2];

    let hashlock1 ,hashlock2;

    result = secret;

    for (let i = 0; i < 7; i++) {

      result = (sha256(result)); 

      if( i == 4 ){
        hashlock1 = result;
      }

      if( i == 6 ){
        hashlock2 = result;
      }
    }

    await token.connect(sender1).approve(htlc.target, senderInitialBalance);

    const txReceipt1 = await htlc
      .connect(sender1)
      .createHTLC(receiver, hashlock1, timeLock1Hour, token.target, tokenAmount, chainId, _address, 5);
    const txReceiptWithEvents1 = await txReceipt1.wait();
    const logArgs1 = txLoggedArgsWithIndex(txReceiptWithEvents1, 1);
    const contractId1 = logArgs1.contractId;

    await token.mint(sender2, senderInitialBalance);
    await token.connect(sender2).approve(htlc.target, senderInitialBalance);

    const txReceipt2 = await htlc
      .connect(sender2)
      .createHTLC(receiver, hashlock2, timeLock1Hour, token.target, tokenAmount, chainId, _address, 7);
    const txReceiptWithEvents2 = await txReceipt2.wait();
    const logArgs2 = txLoggedArgsWithIndex(txReceiptWithEvents2, 1);
    const contractId2 = logArgs2.contractId;

    // receiver calls redeem with the secret to claim the tokens
    await htlc.connect(receiver).batchRedeem([contractId1, contractId2], [secret, secret]);

    // Check tokens now owned by the receiver
    assertTokenBal(receiver, tokenAmount * 2, `receiver doesn't own ${tokenAmount * 2} tokens`);

    const contractArr1 = await htlc.getHTLCDetails(contractId1);
    const contract1 = htlcERC20ArrayToObj(contractArr1);
    assert.isTrue(contract1.withdrawn); // withdrawn set
    assert.isFalse(contract1.refunded); // refunded still false
    assert.equal(contract1.preimage, bufToStr(secret));

    const contractArr2 = await htlc.getHTLCDetails(contractId2);
    const contract2 = htlcERC20ArrayToObj(contractArr2);
    assert.isTrue(contract2.withdrawn); // withdrawn set
    assert.isFalse(contract2.refunded); // refunded still false
    assert.equal(contract2.preimage, bufToStr(secret));
  });

  

});
