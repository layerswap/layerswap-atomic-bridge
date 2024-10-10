import { tx } from "@hirosystems/clarinet-sdk";
import { describe, expect, it } from "vitest";
import { Cl, cvToValue, signMessageHashRsv,createStacksPrivateKey } from "@stacks/transactions";
const crypto = require('crypto');

const accounts = simnet.getAccounts();
const address1 = accounts.get("wallet_1")!;
const address2 = accounts.get("wallet_2")!;

describe("HashedTimeLockStacks Contract Test", () => {
  it("ensures commit function works correctly and  fails with zero value, past timelock", () => {
    const currentBlockTime = BigInt(simnet.getBlockTime());
    const futureTimelock = currentBlockTime + BigInt(60);

    const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
    const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));

    const expectedContractId = seed ^ contractNonce;

    const assets = simnet.getAssetsMap();
    const stxBalances = assets.get("STX")!;
    
    const contractPrincipal = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.HashedTimeLockStacks';
    const initialContractBalance = stxBalances.get(contractPrincipal) || BigInt(0);
    const initialSenderBalance = stxBalances.get(address1) || BigInt(0);

    const block = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "commit", [
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("eth"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("stx"),
        Cl.principal(address2),
        Cl.uint(futureTimelock),
        Cl.uint(1000000)
      ], address1)
    ]);
    const commitResult = block[0].result;
    const contractId = BigInt(commitResult.value.value);
    expect(contractId).toEqual(expectedContractId);

    const contractData = simnet.callReadOnlyFn(
      "HashedTimeLockStacks",
      "get-contract-details",
      [Cl.uint(contractId)],
      address1
    );

    const unwrappedContractData = (contractData.result.value);
    expect(unwrappedContractData).toEqual(Cl.tuple({
      dstAddress: Cl.stringAscii("0x1234..."),
      dstChain: Cl.stringAscii("ethereum"),
      dstAsset: Cl.stringAscii("eth"),
      srcAsset: Cl.stringAscii("stx"),
      sender: Cl.principal(address1),
      srcReceiver: Cl.principal(address2),
      hashlock: Cl.buffer(new Uint8Array(32)),
      timelock: Cl.uint(futureTimelock),
      amount: Cl.uint(1000000),
      secret: Cl.buffer(new Uint8Array(32)),
      redeemed: Cl.bool(false),
      refunded: Cl.bool(false)
    }));

    const updatedAssets = simnet.getAssetsMap();
    const updatedStxBalances = updatedAssets.get("STX")!;
    
    const updatedContractBalance = updatedStxBalances.get(contractPrincipal) || BigInt(0);
    const updatedSenderbalance = updatedStxBalances.get(address1)

    expect(updatedContractBalance).toEqual(initialContractBalance + BigInt(1000000));
    expect(updatedSenderbalance).toEqual(initialSenderBalance - BigInt(1000000));

    const zeroValueBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "commit", [
        Cl.stringAscii("ethereum"), Cl.stringAscii("eth"), Cl.stringAscii("0x1234..."),
        Cl.stringAscii("stx"), Cl.principal(address2), Cl.uint(futureTimelock), Cl.uint(0)
      ], address1)
    ]);
    expect(zeroValueBlock[0].result).toBeErr(Cl.uint(1000));

    simnet.mineEmptyBlocks(10);

    const pastTimelockBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "commit", [
        Cl.stringAscii("ethereum"), Cl.stringAscii("eth"), Cl.stringAscii("0x1234..."),
        Cl.stringAscii("stx"), Cl.principal(address2), Cl.uint(1), Cl.uint(1000000)
      ], address1)
    ]);
    expect(pastTimelockBlock[0].result).toBeErr(Cl.uint(1001));
  });

it("ensures lock function works correctly", () => {
    simnet.mineEmptyBlocks(10);

    const currentBlockTime = BigInt(simnet.getBlockTime());
    const futureTimelock = currentBlockTime + BigInt(60);

    const randomId = BigInt(12345);
    const randomHashlock = new Uint8Array(32).map(() => Math.floor(Math.random() * 256));

    const assets = simnet.getAssetsMap();
    const stxBalances = assets.get("STX")!;
    
    const contractPrincipal = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.HashedTimeLockStacks';
    const initialContractBalance = stxBalances.get(contractPrincipal) || BigInt(0);
    const initialSenderBalance = stxBalances.get(address1) || BigInt(0);

    const block = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "lock", [
        Cl.uint(randomId),
        Cl.buffer(randomHashlock),
        Cl.uint(futureTimelock),
        Cl.principal(address2),
        Cl.stringAscii("stx"),
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("eth"),
        Cl.uint(1000000)
      ], address1)
    ]);

    const lockResult = block[0].result;
    const contractId = BigInt(lockResult.value.value);
    expect(contractId).toEqual(randomId);

    const contractData = simnet.callReadOnlyFn(
      "HashedTimeLockStacks",
      "get-contract-details",
      [Cl.uint(contractId)],
      address1
    );

    const unwrappedContractData = (contractData.result.value);
    expect(unwrappedContractData).toEqual(Cl.tuple({
      dstAddress: Cl.stringAscii("0x1234..."),
      dstChain: Cl.stringAscii("ethereum"),
      dstAsset: Cl.stringAscii("eth"),
      srcAsset: Cl.stringAscii("stx"),
      sender: Cl.principal(address1),
      srcReceiver: Cl.principal(address2),
      hashlock: Cl.buffer(randomHashlock),
      timelock: Cl.uint(futureTimelock),
      amount: Cl.uint(1000000),
      secret: Cl.buffer(new Uint8Array(32)),
      redeemed: Cl.bool(false),
      refunded: Cl.bool(false)
    }));

    const updatedAssets = simnet.getAssetsMap();
    const updatedStxBalances = updatedAssets.get("STX")!;
    
    const updatedContractBalance = updatedStxBalances.get(contractPrincipal) || BigInt(0);
    const updatedSenderbalance = updatedStxBalances.get(address1) || BigInt(0);

    expect(updatedContractBalance).toEqual(initialContractBalance + BigInt(1000000));
    expect(updatedSenderbalance).toEqual(initialSenderBalance - BigInt(1000000));
  });

it("ensures lock function fails with zero value, duplicate id, and past timelock", () => {
    const currentBlockTime = BigInt(simnet.getBlockTime());
    const futureTimelock = currentBlockTime + BigInt(600);
    const pastTimelock = BigInt(1);
    
    const randomId = BigInt(12345);
    const randomHashlock = new Uint8Array(32).map(() => Math.floor(Math.random() * 256));

    const zeroValueBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "lock", [
        Cl.uint(randomId),
        Cl.buffer(randomHashlock),
        Cl.uint(futureTimelock),
        Cl.principal(address2),
        Cl.stringAscii("stx"),
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("eth"),
        Cl.uint(0)
      ], address1)
    ]);
    expect(zeroValueBlock[0].result).toBeErr(Cl.uint(1000));

    const pastTimelockBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "lock", [
        Cl.uint(randomId),
        Cl.buffer(randomHashlock),
        Cl.uint(pastTimelock),
        Cl.principal(address2),
        Cl.stringAscii("stx"),
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("eth"),
        Cl.uint(1000000)
      ], address1)
    ]);
    expect(pastTimelockBlock[0].result).toBeErr(Cl.uint(1001));

    const firstBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "lock", [
        Cl.uint(randomId),
        Cl.buffer(randomHashlock),
        Cl.uint(futureTimelock + BigInt(3600)),
        Cl.principal(address2),
        Cl.stringAscii("stx"),
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("eth"),
        Cl.uint(1000000)
      ], address1)
    ]);
    expect(firstBlock[0].result).toBeOk(Cl.uint(randomId));

    const duplicateIdBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "lock", [
        Cl.uint(randomId),
        Cl.buffer(randomHashlock),
        Cl.uint(futureTimelock + BigInt(3600)),
        Cl.principal(address2),
        Cl.stringAscii("stx"),
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("eth"),
        Cl.uint(1000000)
      ], address1)
    ]);
    expect(duplicateIdBlock[0].result).toBeErr(Cl.uint(1004));
});

it("ensures refund function works correctly for both commit and lock after timelock passes", () => {
    simnet.mineEmptyBlocks(10);

    const currentBlockTime = BigInt(simnet.getBlockTime());
    const futureTimelock = currentBlockTime + BigInt(60);
    const randomId = BigInt(12345);
    const randomHashlock = new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
    const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
    const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));

    const expectedContractId = seed ^ contractNonce;

    const assets = simnet.getAssetsMap();
    const stxBalances = assets.get("STX")!;
    
    const contractPrincipal = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.HashedTimeLockStacks';
    const initialContractBalance = stxBalances.get(contractPrincipal) || BigInt(0);

    const commitBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "commit", [
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("eth"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("stx"),
        Cl.principal(address2),
        Cl.uint(futureTimelock + BigInt(3600)),
        Cl.uint(1000000)
      ], address1)
    ]);
    expect(commitBlock[0].result).toBeOk(Cl.uint(expectedContractId));

    const lockBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "lock", [
        Cl.uint(randomId),
        Cl.buffer(randomHashlock),
        Cl.uint(futureTimelock + BigInt(3600)),
        Cl.principal(address2),
        Cl.stringAscii("stx"),
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("eth"),
        Cl.uint(1000000)
      ], address1)
    ]);
    expect(lockBlock[0].result).toBeOk(Cl.uint(randomId));

    const updatedAssetsMiddle = simnet.getAssetsMap();
    const updatedStxBalancesMiddle = updatedAssetsMiddle.get("STX")!;
    const updatedContractBalanceAfterLocks = updatedStxBalancesMiddle.get(contractPrincipal) || BigInt(0);
    expect(updatedContractBalanceAfterLocks).toEqual(initialContractBalance + BigInt(2000000)); 
    simnet.mineEmptyBlocks(60);

    const refundCommitBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "refund", [
        Cl.uint(expectedContractId) 
      ], address1)
    ]);
    expect(refundCommitBlock[0].result).toBeOk(Cl.bool(true));

    const refundLockBlock = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "refund", [
        Cl.uint(randomId)
      ], address1)
    ]);
    expect(refundLockBlock[0].result).toBeOk(Cl.bool(true));

    const updatedAssets = simnet.getAssetsMap();
    const updatedStxBalances = updatedAssets.get("STX")!;
    
    const updatedContractBalance = updatedStxBalances.get(contractPrincipal) || BigInt(0);
    expect(updatedContractBalance).toEqual(initialContractBalance); 
  });

it("ensures redeem function works correctly", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);
  const randomId = BigInt(12345);
  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const assets = simnet.getAssetsMap();
  const stxBalances = assets.get("STX")!;
  
  const initialReceiverBalance = stxBalances.get(address2) || BigInt(0);

  const lockBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "lock", [
      Cl.uint(randomId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600)),
      Cl.principal(address2),
      Cl.stringAscii("stx"),
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("eth"),
      Cl.uint(1000000)
    ], address1)
  ]);
  expect(lockBlock[0].result).toBeOk(Cl.uint(randomId));

  const redeemBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "redeem", [
      Cl.uint(randomId),Cl.buffer(secret) 
    ], address1)
  ]);
  expect(redeemBlock[0].result).toBeOk(Cl.bool(true));

  const updatedAssets = simnet.getAssetsMap();
  const updatedStxBalances = updatedAssets.get("STX")!;
  
  const receiverBalance = updatedStxBalances.get(address2) || BigInt(0);
  expect(receiverBalance).toEqual(initialReceiverBalance + BigInt(1000000)); 


  const alreadyRedeemedBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "redeem", [
      Cl.uint(randomId), Cl.buffer(secret)
    ], address1)
  ]);
  expect(alreadyRedeemedBlock[0].result).toBeErr(Cl.uint(1007)); 
});

it("fails when trying to redeem a refunded contract", () => {
  const randomId = BigInt(12345);
  const futureTimelock = BigInt(simnet.getBlockTime()) + BigInt(60);
  const randomHashlock = new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
  const lockBlock = simnet.mineBlock([
  tx.callPublicFn("HashedTimeLockStacks", "lock", [
      Cl.uint(randomId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600)),
      Cl.principal(address2),
      Cl.stringAscii("stx"),
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("eth"),
      Cl.uint(1000000)
    ], address1)
  ]);
  expect(lockBlock[0].result).toBeOk(Cl.uint(randomId));

  simnet.mineEmptyBlocks(10);
  const refundBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "refund", [
      Cl.uint(randomId)
    ], address1)
  ]);

  expect(refundBlock[0].result).toBeOk(Cl.bool(true));

  const redeemAfterRefundBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "redeem", [
      Cl.uint(randomId), Cl.buffer(crypto.randomBytes(32))
    ], address1)
  ]);
  expect(redeemAfterRefundBlock[0].result).toBeErr(Cl.uint(1008)); 
});

it("fails when hashlock does not match the provided secret", () => {
  const randomId = BigInt(12345);
  const futureTimelock = BigInt(simnet.getBlockTime()) + BigInt(60);
  const randomHashlock = new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
  const lockBlock = simnet.mineBlock([
  tx.callPublicFn("HashedTimeLockStacks", "lock", [
      Cl.uint(randomId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600)),
      Cl.principal(address2),
      Cl.stringAscii("stx"),
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("eth"),
      Cl.uint(1000000)
    ], address1)
  ]);
  expect(lockBlock[0].result).toBeOk(Cl.uint(randomId));
  const wrongSecret = crypto.randomBytes(32); 

  const wrongHashlockBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "redeem", [
      Cl.uint(randomId), Cl.buffer(wrongSecret)
    ], address1)
  ]);
  expect(wrongHashlockBlock[0].result).toBeErr(Cl.uint(1006));
});

it("ensures addLock function works correctly", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  const block = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);
  const commitResult = block[0].result;
  const contractId = BigInt(commitResult.value.value);
  expect(contractId).toEqual(expectedContractId);

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const addLock = simnet.mineBlock([tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600))
    ], address1)]);

  expect(addLock[0].result).toBeOk(Cl.uint(contractId)); 

  const contractData = simnet.callReadOnlyFn(
    "HashedTimeLockStacks",
    "get-contract-details",
    [Cl.uint(contractId)],
    address1
  );

  const unwrappedContractData = (contractData.result.value);
  expect(unwrappedContractData).toEqual(Cl.tuple({
    dstAddress: Cl.stringAscii("0x1234..."),
    dstChain: Cl.stringAscii("ethereum"),
    dstAsset: Cl.stringAscii("eth"),
    srcAsset: Cl.stringAscii("stx"),
    sender: Cl.principal(address1),
    srcReceiver: Cl.principal(address2),
    hashlock: Cl.buffer(randomHashlock),
    timelock: Cl.uint(futureTimelock + BigInt(3600)),
    amount: Cl.uint(1000000),
    secret: Cl.buffer(new Uint8Array(32)),
    redeemed: Cl.bool(false),
    refunded: Cl.bool(false)
  }));
  ;
});

it("fails add-lock if the HTLC contract does not exist", () => {
  const fakeId = BigInt(99999); 

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const block = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(fakeId), 
      Cl.buffer(randomHashlock),
      Cl.uint(BigInt(3600))
    ], address1)
  ]);
  
  expect(block[0].result).toBeErr(Cl.uint(1005));
});

it("fails add-lock if the sender does not match", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);
  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const block = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600))
    ], address2) 
  ]);

  expect(block[0].result).toBeErr(Cl.uint(1010)); 
});

it("fails add-lock if the hashlock is already set", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);
  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600))
    ], address1)
  ]);

  const block = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600))
    ], address1)
  ]);

  expect(block[0].result).toBeErr(Cl.uint(1012)); 
});

it("fails add-lock if the HTLC has already been refunded", () => {
const currentBlockTime = BigInt(simnet.getBlockTime());
const futureTimelock = currentBlockTime + BigInt(60);
const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
const expectedContractId = seed ^ contractNonce;

simnet.mineBlock([
  tx.callPublicFn("HashedTimeLockStacks", "commit", [
    Cl.stringAscii("ethereum"),
    Cl.stringAscii("eth"),
    Cl.stringAscii("0x1234..."),
    Cl.stringAscii("stx"),
    Cl.principal(address2),
    Cl.uint(futureTimelock),
    Cl.uint(1000000)
  ], address1)
]);

const secret = crypto.randomBytes(32);
const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
const randomHashlock = new Uint8Array(hashlockBuffer);

simnet.mineBlock([
  tx.callPublicFn("HashedTimeLockStacks", "refund", [
    Cl.uint(expectedContractId)
  ], address1)
]);

const block = simnet.mineBlock([
  tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
    Cl.uint(expectedContractId),
    Cl.buffer(randomHashlock),
    Cl.uint(futureTimelock + BigInt(3600))
  ], address1)
]);

expect(block[0].result).toBeErr(Cl.uint(1008)); 
});

it("fails add-lock if the timelock has already passed", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  const blockCommit = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(currentBlockTime + BigInt(36000)), 
      Cl.uint(1000000)
    ], address1)
  ]);
  expect(blockCommit[0].result).toBeOk(Cl.uint(expectedContractId)); 
  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  simnet.mineEmptyBlocks(10)
  const block = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(1) 
    ], address1)
  ]);
  expect(block[0].result).toBeErr(Cl.uint(1001)); 
});

 it("ensures add-lock-sig function works correctly", () => {
    const currentBlockTime = BigInt(simnet.getBlockTime());
    const futureTimelock = currentBlockTime + BigInt(60);

    const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
    const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
    const expectedContractId = seed ^ contractNonce;

    const block = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "commit", [
        Cl.stringAscii("ethereum"),
        Cl.stringAscii("eth"),
        Cl.stringAscii("0x1234..."),
        Cl.stringAscii("stx"),
        Cl.principal(address2),
        Cl.uint(futureTimelock + BigInt(1200)),
        Cl.uint(1000000)
      ], address1)
    ]);
    const commitResult = block[0].result;
    const contractId = BigInt(commitResult.value.value);
    expect(contractId).toEqual(expectedContractId);

    const secret = crypto.randomBytes(32);
    const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
    const randomHashlock = new Uint8Array(hashlockBuffer);

    const idBytes = Cl.serialize(Cl.uint(contractId));
    const timelockBytes = Cl.serialize(Cl.uint(futureTimelock + BigInt(3600)));
    const message = Buffer.concat([idBytes, randomHashlock, timelockBytes]);

    const messageHash = crypto.createHash("sha256").update(message).digest("hex");
    const signature = signMessageHashRsv({
                                            messageHash: messageHash,
                                            privateKey: createStacksPrivateKey("7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801"),
                                          }).data;

    const addLockSig = simnet.mineBlock([
      tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
        Cl.uint(contractId),
        Cl.buffer(randomHashlock),
        Cl.uint(futureTimelock + BigInt(3600)),
        Cl.buffer(new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))))
      ], address2)
    ]);

    expect(addLockSig[0].result).toBeOk(Cl.uint(contractId));

    const contractData = simnet.callReadOnlyFn(
      "HashedTimeLockStacks",
      "get-contract-details",
      [Cl.uint(contractId)],
      address1
    );

    const unwrappedContractData = contractData.result.value;
    expect(unwrappedContractData).toEqual(Cl.tuple({
      dstAddress: Cl.stringAscii("0x1234..."),
      dstChain: Cl.stringAscii("ethereum"),
      dstAsset: Cl.stringAscii("eth"),
      srcAsset: Cl.stringAscii("stx"),
      sender: Cl.principal(address1),
      srcReceiver: Cl.principal(address2),
      hashlock: Cl.buffer(randomHashlock),
      timelock: Cl.uint(futureTimelock + BigInt(3600)),
      amount: Cl.uint(1000000),
      secret: Cl.buffer(new Uint8Array(32)),
      redeemed: Cl.bool(false),
      refunded: Cl.bool(false)
    }));
  });

  it("fails if the HTLC does not exist", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);

  const randomHashlock = new Uint8Array(crypto.randomBytes(32));
  const signature = new Uint8Array(65).fill(0);

  const addLockSig = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
      Cl.uint(12345),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock),
      Cl.buffer(signature)
    ], address2)
  ]);

  expect(addLockSig[0].result).toBeErr(Cl.uint(1005));
});

it("fails if the signature is invalid", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);

  const randomHashlock = new Uint8Array(crypto.randomBytes(32));
  const invalidSignature = new Uint8Array(65).fill(1);

  const addLockSig = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(1600)),
      Cl.buffer(invalidSignature)
    ], address2)
  ]);

  expect(addLockSig[0].result).toBeErr(Cl.uint(1011));
});

it("fails if the HTLC is already refunded", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  const commitBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);
  const commitResult = commitBlock[0].result;
  expect(commitResult).toBeOk(Cl.uint(expectedContractId));
  simnet.mineEmptyBlocks(10);
  const refundBlock =   simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "refund", [
      Cl.uint(expectedContractId)
    ], address1)
  ]);
  expect(refundBlock[0].result).toBeOk(Cl.bool(true));

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const idBytes = Cl.serialize(Cl.uint(expectedContractId));
  const timelockBytes = Cl.serialize(Cl.uint(futureTimelock + BigInt(3600)));
  const message = Buffer.concat([idBytes, randomHashlock, timelockBytes]);

  const messageHash = crypto.createHash("sha256").update(message).digest("hex");
  const signature = signMessageHashRsv({
    messageHash: messageHash,
    privateKey: createStacksPrivateKey("7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801"),
  }).data;

  const addLockSig = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600)),
      Cl.buffer(new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))))
    ], address2)
  ]);

  expect(addLockSig[0].result).toBeErr(Cl.uint(1008));
});

it("fails if the timelock is in the past", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const pastTimelock = currentBlockTime - BigInt(3600);

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(pastTimelock + BigInt(360000)),
      Cl.uint(1000000)
    ], address1)
  ]);

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const idBytes = Cl.serialize(Cl.uint(expectedContractId));
  const timelockBytes = Cl.serialize(Cl.uint(pastTimelock));
  const message = Buffer.concat([idBytes, randomHashlock, timelockBytes]);

  const messageHash = crypto.createHash("sha256").update(message).digest("hex");
  const signature = signMessageHashRsv({
    messageHash: messageHash,
    privateKey: createStacksPrivateKey("7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801"),
  }).data;

  const addLockSig = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(pastTimelock),
      Cl.buffer(new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))))
    ], address2)
  ]);

  expect(addLockSig[0].result).toBeErr(Cl.uint(1001));
});

it("fails if the hashlock is already set", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

 simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600))
    ], address1)
  ]);

  const idBytes = Cl.serialize(Cl.uint(expectedContractId));
  const timelockBytes = Cl.serialize(Cl.uint(futureTimelock + BigInt(3600)));
  const message = Buffer.concat([idBytes, randomHashlock, timelockBytes]);

  const messageHash = crypto.createHash("sha256").update(message).digest("hex");
  const signature = signMessageHashRsv({
    messageHash: messageHash,
    privateKey: createStacksPrivateKey("7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801"),
  }).data;

  const addLockSig = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
      Cl.uint(expectedContractId),
      Cl.buffer(randomHashlock),
      Cl.uint(futureTimelock + BigInt(3600)),
      Cl.buffer(new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))))
    ], address2)
  ]);

  expect(addLockSig[0].result).toBeErr(Cl.uint(1012));
});

it("fails if the signature is correct but one of the arguments is wrong", () => {
  const currentBlockTime = BigInt(simnet.getBlockTime());
  const futureTimelock = currentBlockTime + BigInt(60);

  const contractNonce = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "contract-nonce"));
  const seed = cvToValue(simnet.getDataVar("HashedTimeLockStacks", "seed"));
  const expectedContractId = seed ^ contractNonce;

  const commitBlock = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "commit", [
      Cl.stringAscii("ethereum"),
      Cl.stringAscii("eth"),
      Cl.stringAscii("0x1234..."),
      Cl.stringAscii("stx"),
      Cl.principal(address2),
      Cl.uint(futureTimelock + BigInt(1200)),
      Cl.uint(1000000)
    ], address1)
  ]);
  const commitResult = commitBlock[0].result;
  const contractId = BigInt(commitResult.value.value);
  expect(contractId).toEqual(expectedContractId);

  const secret = crypto.randomBytes(32);
  const hashlockBuffer = crypto.createHash('sha256').update(secret).digest();
  const randomHashlock = new Uint8Array(hashlockBuffer);

  const idBytes = Cl.serialize(Cl.uint(contractId));
  const timelockBytes = Cl.serialize(Cl.uint(futureTimelock + BigInt(3600)));
  const message = Buffer.concat([idBytes, randomHashlock, timelockBytes]);

  const messageHash = crypto.createHash("sha256").update(message).digest("hex");
  const signature = signMessageHashRsv({
    messageHash: messageHash,
    privateKey: createStacksPrivateKey("7287ba251d44a4d3fd9276c88ce34c5c52a038955511cccaf77e61068649c17801"),
  }).data;

  const wrongTimelock = futureTimelock + BigInt(7200); 

  const addLockSig = simnet.mineBlock([
    tx.callPublicFn("HashedTimeLockStacks", "add-lock-sig", [
      Cl.uint(contractId),
      Cl.buffer(randomHashlock),
      Cl.uint(wrongTimelock), 
      Cl.buffer(new Uint8Array(signature.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))))
    ], address2)
  ]);

  expect(addLockSig[0].result).toBeErr(Cl.uint(1011));
});


});
