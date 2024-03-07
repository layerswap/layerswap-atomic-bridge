const { ethers } = require('hardhat');
const { assert } = require('chai');
const { parseUnits, formatEther } = require("@ethersproject/units");
const { BigNumber, BigInt, FixedFormat, FixedNumber, formatFixed, parseFixed, BigNumberish } = require("@ethersproject/bignumber");


const { loadFixture } = require('@nomicfoundation/hardhat-network-helpers');
const { expect } = require('chai');

const {
  bufToStr,
  getBalance,
  htlcArrayToObj,
  isSha256Hash,
  newSecretHashPair,
  nowSeconds,
  random32,
  txContractId,
  txGas,
  txLoggedArgs,
} = require('./helper/utils');

//const REQUIRE_FAILED_MSG = 'Returned error: VM Exception while processing transaction: revert';

const hourSeconds = 3600;
const timeLock1Hour = nowSeconds() + hourSeconds;
const oneFinney = parseUnits('1').toString();

describe('HashedTimelock', () => {
  let HashedTimelock;
  let htlc;
  let accounts;

  before(async () => {
    //Deploy the HashedTimelock contract
    HashedTimelock = await ethers.getContractFactory('HashedTimelockEther');
    htlc = await HashedTimelock.deploy();

    accounts = await ethers.getSigners();

    // const hashPair = newSecretHashPair();
    // const sender = accounts[0].address;
    // const receiver = accounts[1].address;
  });

  it('newContract() should create new contract and store correct details', async () => {
    const hashPair = newSecretHashPair();
    const sender = accounts[0].address;
    const receiver = accounts[1].address;

    const txReceipt = await htlc.createHTLC(receiver, hashPair.hash, timeLock1Hour, {
      value: oneFinney,
    });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgs(txReceiptWithEvents);

    const contractId = logArgs.contractId;
    assert(isSha256Hash(contractId));

    assert.equal(logArgs.sender, sender);
    assert.equal(logArgs.receiver, receiver);
    assert.equal(logArgs.amount.toString(), oneFinney.toString());
    assert.equal(logArgs.hashlock, hashPair.hash);
    assert.equal(logArgs.timelock, timeLock1Hour);

    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcArrayToObj(contractArr);
    assert.equal(contract.sender, sender);
    assert.equal(contract.receiver, receiver);
    assert.equal(contract.amount.toString(), oneFinney.toString());
    assert.equal(contract.hashlock, hashPair.hash);
    assert.equal(contract.timelock, timeLock1Hour);
    assert.isFalse(contract.withdrawn);
    assert.isFalse(contract.refunded);
    assert.equal(contract.preimage, '0x0000000000000000000000000000000000000000000000000000000000000000');
  });


  it("newContract() should fail when no ETH sent", async function () {
    const hashPair = newSecretHashPair();
    const receiver = accounts[1].address;
    try {
      // Execute the transaction that should revert with the custom error
      await htlc.createHTLC(receiver, hashPair.hash, timeLock1Hour, { value: 0 });
      // If no error is thrown, fail the test
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      // Check if the error thrown is of type 'FundsNotSent'
      assert.include(error.message, "FundsNotSent");
    }
  });

  it("newContract() should fail with timelocks in the past", async function () {
    const hashPair = newSecretHashPair();
    const receiver = accounts[1].address;
    const pastTimelock = (await ethers.provider.getBlock("latest")).timestamp - 1;
    try {
      // Execute the transaction that should revert with the custom error
      await htlc.createHTLC(receiver, hashPair.hash, pastTimelock, { value: oneFinney });
      // If no error is thrown, fail the test
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "NotFutureTimelock");
    }
  });

  it("newContract() should reject a duplicate contract request", async function () {
    const hashPair = newSecretHashPair();
    const receiver = accounts[1].address;
    await htlc.createHTLC(receiver, hashPair.hash, timeLock1Hour, { value: oneFinney });
    try {
      await htlc.createHTLC(receiver, hashPair.hash, timeLock1Hour, { value: oneFinney });
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "ContractAlreadyExist");
    }
  });

  it("withdraw() should send receiver funds when given the correct secret preimage", async function () {

    //BigNumber.from(`${txReceipt.receipt.gasUsed * gasPrice}`);
    
    const hashPair = newSecretHashPair();
    const sender = accounts[0];
    const receiver = accounts[1];
    const txReceipt = await htlc.connect(sender).createHTLC(receiver, hashPair.hash, timeLock1Hour, { value: oneFinney });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgs(txReceiptWithEvents);
    const contractId = logArgs.contractId;

    const receiverBalBefore = await getBalance(receiver);

    const withdrawTx = await htlc.connect(receiver).redeem(contractId, hashPair.secret);
    const tx = await withdrawTx.wait();

    const gasUsed = BigNumber.from(tx.gasUsed);
    const gasPrice = BigNumber.from(tx.gasPrice);

    const gasCost = gasUsed.mul(gasPrice);

    const expectedBal = receiverBalBefore.add(oneFinney).sub(gasCost);

    const receiverBalAfter = await getBalance(receiver);

    //expect(await getBalance(receiver)).to.equal(expectedBal);
    expect(receiverBalAfter.eq(expectedBal)).to.be.true;
    
    const contractArr = await htlc.getHTLCDetails(contractId);
    const contract = htlcArrayToObj(contractArr);
    expect(contract.withdrawn).to.be.true;
    expect(contract.refunded).to.be.false;
    expect(contract.preimage).to.equal(hashPair.secret);
  });

  it("withdraw() should fail if preimage does not hash to hashX", async function () {
    const hashPair = newSecretHashPair();
    const sender = accounts[0];
    const receiver = accounts[1];
    const txReceipt = await htlc.connect(sender).createHTLC(receiver.address, hashPair.hash, timeLock1Hour, { value: oneFinney });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgs(txReceiptWithEvents);
    const contractId = logArgs.contractId;
    const wrongSecret = bufToStr(random32());
    try {
      await htlc.connect(receiver).redeem(contractId, wrongSecret);
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "HashlockNotMatch");
    }
  });

  it("withdraw() should fail if caller is not the receiver", async function () {
    const hashPair = newSecretHashPair();
    const sender = accounts[0];
    const receiver = accounts[1];
    const txReceipt = await htlc.connect(sender).createHTLC(receiver.address, hashPair.hash, timeLock1Hour, { value: oneFinney });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgs(txReceiptWithEvents);
    const contractId = logArgs.contractId;
    const someGuy = accounts[4];
    try {
      await htlc.connect(someGuy).redeem(contractId, hashPair.secret);
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "NotReceiver");
    }
  });

  it("withdraw() should fail after timelock expiry", async function () {
    const hashPair = newSecretHashPair();
    const sender = accounts[0];
    const receiver = accounts[1];
    const timelock1Second = (await ethers.provider.getBlock("latest")).timestamp + 10;

    const txReceipt = await htlc.connect(sender).createHTLC(receiver.address, hashPair.hash, timelock1Second, { value: oneFinney });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgs(txReceiptWithEvents);
    const contractId = logArgs.contractId;

    await ethers.provider.send("evm_increaseTime", [20]); // Increase time by 20 seconds

    try {
      await htlc.connect(receiver).redeem(contractId, hashPair.secret);
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "NotFutureTimelock");
    }
  });

  it("refund() should fail before the timelock expiry", async function () {
    const hashPair = newSecretHashPair();
    const sender = accounts[0];
    const receiver = accounts[1];

    const txReceipt = await htlc.connect(sender).createHTLC(receiver.address, hashPair.hash, timeLock1Hour, { value: oneFinney });
    const txReceiptWithEvents = await txReceipt.wait();
    const logArgs = txLoggedArgs(txReceiptWithEvents);
    const contractId = logArgs.contractId;
    
    //await expect(hashedTimelock.connect(sender).refund(contractId)).to.be.revertedWith("VM Exception while processing transaction: revert");

    try {
      await htlc.connect(sender).refund(contractId);
      assert.fail("Transaction did not revert as expected");
    } catch (error) {
      assert.include(error.message, "NotPassedTimelock");
    }
  });

  it("getHTLCDetails() returns empty record when contract doesn't exist", async function () {
    // Use a placeholder address for a non-existent contract
    const nonExistentContractId = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const contract = await htlc.getHTLCDetails(nonExistentContractId);
    expect(Number(contract[0])).to.equal(0);
});
});
