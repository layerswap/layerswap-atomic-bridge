const { ethers } = require('hardhat');
const { assert } = require('chai');
const { parseUnits, formatEther } = require("@ethersproject/units");
const { BigNumber, BigInt, FixedFormat, FixedNumber, formatFixed, parseFixed, BigNumberish } = require("@ethersproject/bignumber");

const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

const { assertEqualBN } = require('./helper/assert');
const {
  bufToStr,
  htlcERC20ArrayToObj,
  isSha256Hash,
  newSecretHashPair,
  nowSeconds,
  random32,
  txContractId,
  txLoggedArgs,
  txLoggedArgsWithIndex,
} = require('./helper/utils');

// some testing data
const hourSeconds = 3600;
const timeLock1Hour = nowSeconds() + hourSeconds;
const tokenAmount = 10;
const tokenSupply = 1000;
const senderInitialBalance = 1000;
const chainId = 1;
const _address = "0x0";

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
    //hashPair = newSecretHashPair();

    await token.mint(sender.address, senderInitialBalance);
  });

  it('newContract() should create new contract and store correct details', async () => {
    hashPair = newSecretHashPair();
    await token.connect(sender).approve(htlc, senderInitialBalance);
    const txReceipt = await htlc.connect(sender).createHTLC(receiver.address, hashPair.hash, timeLock1Hour, token.target, tokenAmount, chainId, _address);
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
    assert.equal(
      contract.preimage,
      '0x0000000000000000000000000000000000000000000000000000000000000000'
    );
  });


  it('newContract() should fail when no token transfer approved', async () => {
    await token.approve(htlc.target, 0, { from: sender }); // ensure 0
    await newContractExpectFailure("ERC20InsufficientAllowance");
  });

  it('newContract() should fail when token amount is 0', async () => {
    // approve htlc for one token but send amount as 0
    //await token.approve(htlc.address, 1, { from: sender });
    await newContractExpectFailure("FundsNotSent",
      {
        amount: 0,
      });
  });

  it('newContract() should fail when tokens approved for some random account', async () => {
    // approve htlc for different account to the htlc contract
    await token.approve(htlc.target, 0, { from: sender }); // ensure 0
    await token.approve(accounts[9].address, tokenAmount, { from: sender });
    await newContractExpectFailure("ERC20InsufficientAllowance");
  });

  it('newContract() should fail when the timelock is in the past', async () => {
    const pastTimelock = nowSeconds() - 2;
    await token.approve(htlc.target, tokenAmount, { from: sender });
    await newContractExpectFailure("NotFutureTimelock", { timelock: pastTimelock });
  });

  it('newContract() should reject a duplicate contract request', async () => {
    const hashlock = newSecretHashPair().hash;
    const timelock = timeLock1Hour + 5;
    const balBefore = BigNumber.from(await token.balanceOf(htlc.target));

    await newContract({ hashlock: hashlock, timelock: timelock });
    assertTokenBal(htlc.address, tokenAmount);

    const balAfter = balBefore.add(tokenAmount);

    assertTokenBal(
      htlc.address,
      balAfter,
      'tokens not transfered to htlc contract'
    );

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

    //receiver calls redeem with the secret to claim the tokens
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

  it('redeem() should fail if caller is not the receiver ', async () => {
    const hashPair = newSecretHashPair();
    await token.approve(htlc.target, tokenAmount, { from: sender });
    const txReceipt = await newContract({
      hashlock: hashPair.hash,
    });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;
    const someGuy = accounts[4];
    try {
      await htlc.connect(someGuy).redeem(contractId, hashPair.secret);
      assert.fail('expected failure due to wrong receiver');
    } catch (error) {
      assert.include(error.message, 'NotReceiver');
    }
  });

  it('redeem() should fail after timelock expiry', async () => {
    const hashPair = newSecretHashPair()
    const timelock20Seconds = (await ethers.provider.getBlock("latest")).timestamp + 20;
    await token.approve(htlc.target, tokenAmount, { from: sender });

    const txReceipt = await newContract({
      hashlock: hashPair.hash,
      timelock: timelock20Seconds,
    })
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    await ethers.provider.send("evm_increaseTime", [21]); // Increase time by 21 seconds

    try {
      await htlc.connect(receiver).redeem(contractId, hashPair.secret);
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "NotFutureTimelock");
    }

  })

  it('refund() should pass after timelock expiry', async () => {
    const hashPair = newSecretHashPair();
    const timelock20Seconds = (await ethers.provider.getBlock("latest")).timestamp + 20;

    await token.approve(htlc.target, tokenAmount, { from: sender });
    const txReceipt = await newContract({
      timelock: timelock20Seconds,
      hashlock: hashPair.hash,
    });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgsWithIndex(txReceiptWithEvents, 1);
    const contractId = logArgs.contractId;

    await ethers.provider.send("evm_increaseTime", [30]); // Increase time by 30 seconds
    //const balBefore = await token.balanceOf(sender);
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
    const timelock20Seconds = (await ethers.provider.getBlock("latest")).timestamp + 20;

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
    await ethers.provider.send("evm_increaseTime", [30]); // Increase time by 30 seconds

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
    //await token.approve(htlc.address, tokenAmount, { from: sender });
    return htlc.createHTLC(receiver.address, hashlock, timelock, token.target, tokenAmount, chainId, _address, {
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
      await htlc.createHTLC(receiverAddr, hashlock, timelock, token.target, amount, chainId, _address, {
        from: sender,
      });
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, shouldFailMsg);
    }
  };
});
