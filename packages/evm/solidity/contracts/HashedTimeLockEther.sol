// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

interface IMessenger {
  function notify(
    uint256 commitId,
    bytes32 hashlock,
    string memory dstChain,
    string memory dstAsset,
    string memory dstAddress,
    string memory srcAsset,
    address payable sender,
    address payable srcReceiver,
    uint256 amount,
    uint256 timelock,
    address tokenContract
  ) external;
}

contract HashedTimeLockEther {
  uint256 private id = 0;

  error FundsNotSent();
  error NotFutureTimelock();
  error NotPassedTimelock();
  error LockAlreadyExists();
  error LockNotExists();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyUnlocked();
  error NoMessenger();
  error CommitmentNotExists();
  error AlreadyLocked();
  error AlreadyUncommitted();
  error NoAllowance();

  struct HTLC {
    string dstAddress;
    string dstChain;
    string dstAsset;
    string srcAsset;
    address payable sender;
    address payable srcReceiver;
    bytes32 hashlock;
    bytes32 secret;
    uint256 amount;
    uint256 timelock;
    bool redeemed;
    bool unlocked;
  }

  struct PHTLC {
    string dstAddress;
    string dstChain;
    string dstAsset;
    string srcAsset;
    address payable sender;
    address payable srcReceiver;
    uint timelock;
    uint amount;
    address messenger;
    bool locked;
    bool uncommitted;
  }
  event TokenCommitted(
    uint commitId,
    string[] HopChains,
    string[] HopAssets,
    string[] HopAddresses,
    string dstChain,
    string dstAddress,
    string dstAsset,
    address sender,
    address srcReceiver,
    string srcAsset,
    uint amount,
    uint timelock,
    address messenger
  );
  event TokenLocked(
    bytes32 indexed hashlock,
    string dstChain,
    string dstAddress,
    string dstAsset,
    address indexed sender,
    address indexed srcReceiver,
    string srcAsset,
    uint amount,
    uint timelock,
    address messenger,
    uint commitId
  );

  event LowLevelErrorOccurred(bytes lowLevelData);
  event TokenUnlocked(bytes32 indexed lockId);
  event TokenUncommitted(uint indexed commitId);
  event TokenRedeemed(bytes32 indexed lockId, address redeemAddress);

  modifier _committed(uint commitId) {
    if (!hasPHTLC(commitId)) revert CommitmentNotExists();
    _;
  }

  modifier _locked(bytes32 lockId) {
    if (!hasHTLC(lockId)) revert LockNotExists();
    _;
  }

  mapping(bytes32 => HTLC) locks;
  mapping(uint => PHTLC) commits;
  bytes32[] lockIds;

  function commit(
    string[] memory HopChains,
    string[] memory HopAssets,
    string[] memory HopAddresses,
    string memory dstChain,
    string memory dstAsset,
    string memory dstAddress,
    string memory srcAsset,
    address srcReceiver,
    uint timelock,
    address messenger
  ) external payable returns (uint commitId) {
    id += 1;
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    commitId = id;

    commits[commitId] = PHTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      timelock,
      msg.value,
      messenger,
      false,
      false
    );

    emit TokenCommitted(
      id,
      HopChains,
      HopAssets,
      HopAddresses,
      dstChain,
      dstAddress,
      dstAsset,
      msg.sender,
      srcReceiver,
      srcAsset,
      msg.value,
      timelock,
      messenger
    );
  }

  function uncommit(uint commitId) external _committed(commitId) returns (bool) {
    PHTLC storage phtlc = commits[commitId];

    if (phtlc.uncommitted) revert AlreadyUncommitted();
    if (phtlc.locked) revert AlreadyLocked();
    if (phtlc.timelock > block.timestamp) revert NotPassedTimelock();

    phtlc.uncommitted = true;
    phtlc.sender.transfer(phtlc.amount);
    emit TokenUncommitted(commitId);
    return true;
  }

  function lockCommitment(uint commitId, bytes32 hashlock) external _committed(commitId) returns (bytes32 lockId) {
    lockId = hashlock;
    if (commits[commitId].uncommitted == true) {
      revert AlreadyUncommitted();
    }
    if (commits[commitId].locked == true) {
      revert AlreadyLocked();
    }
    if (hasHTLC(lockId)) {
      revert LockAlreadyExists();
    }
    if (msg.sender == commits[commitId].sender || msg.sender == commits[commitId].messenger) {
      commits[commitId].locked = true;

      locks[lockId] = HTLC(
        commits[commitId].dstAddress,
        commits[commitId].dstChain,
        commits[commitId].dstAsset,
        commits[commitId].srcAsset,
        payable(commits[commitId].sender),
        commits[commitId].srcReceiver,
        hashlock,
        0x0,
        commits[commitId].amount,
        commits[commitId].timelock,
        false,
        false
      );
      lockIds.push(hashlock);
      emit TokenLocked(
        hashlock,
        commits[commitId].dstChain,
        commits[commitId].dstAddress,
        commits[commitId].dstAsset,
        commits[commitId].sender,
        commits[commitId].srcReceiver,
        commits[commitId].srcAsset,
        commits[commitId].amount,
        commits[commitId].timelock,
        commits[commitId].messenger,
        commitId
      );
    } else {
      revert NoAllowance();
    }
  }

  function lock(
    bytes32 hashlock,
    uint256 timelock,
    address payable srcReceiver,
    string memory srcAsset,
    string memory dstChain,
    string memory dstAddress,
    string memory dstAsset,
    uint commitId,
    address messenger
  ) external payable returns (bytes32 lockId) {
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    if (hasHTLC(hashlock)) {
      revert LockAlreadyExists();
    }

    locks[hashlock] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      srcReceiver,
      hashlock,
      0x0,
      msg.value,
      timelock,
      false,
      false
    );
    lockId = hashlock;
    lockIds.push(hashlock);
    emit TokenLocked(
      hashlock,
      dstChain,
      dstAddress,
      dstAsset,
      msg.sender,
      srcReceiver,
      srcAsset,
      msg.value,
      timelock,
      messenger,
      commitId
    );

    if (messenger != address(0)) {
      uint256 codeSize;
      assembly {
        codeSize := extcodesize(messenger)
      }
      if (codeSize > 0) {
        try
          IMessenger(messenger).notify(
            commitId,
            hashlock,
            dstChain,
            dstAsset,
            dstAddress,
            srcAsset,
            payable(msg.sender),
            srcReceiver,
            msg.value,
            timelock,
            address(0)
          )
        {
          // Notify successful
        } catch Error(string memory reason) {
          revert(reason);
        } catch (bytes memory lowLevelData) {
          emit LowLevelErrorOccurred(lowLevelData);
          revert('IMessenger notify failed');
        }
      } else {
        revert NoMessenger();
      }
    }
  }

  function redeem(bytes32 lockId, bytes32 _secret) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    bytes32 pre = sha256(abi.encodePacked(_secret));
    if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if (htlc.unlocked) revert AlreadyUnlocked();
    if (htlc.redeemed) revert AlreadyRedeemed();

    htlc.secret = _secret;
    htlc.redeemed = true;
    htlc.srcReceiver.transfer(htlc.amount);
    emit TokenRedeemed(lockId, msg.sender);
    return true;
  }

  function unlock(bytes32 lockId) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    if (htlc.unlocked) revert AlreadyUnlocked();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.unlocked = true;
    htlc.sender.transfer(htlc.amount);
    emit TokenUnlocked(lockId);
    return true;
  }

  function getLockDetails(
    bytes32 lockId
  )
    public
    view
    returns (
      bytes32 hashlock,
      bytes32 secret,
      uint256 amount,
      uint256 timelock,
      address payable sender,
      address payable srcReceiver,
      bool redeemed,
      bool unlocked
    )
  {
    if (!hasHTLC(lockId)) {
      return (
        bytes32(0x0),
        bytes32(0x0),
        uint256(0),
        uint256(0),
        payable(address(0)),
        payable(address(0)),
        false,
        false
      );
    }
    HTLC storage htlc = locks[lockId];
    return (
      htlc.hashlock,
      htlc.secret,
      htlc.amount,
      htlc.timelock,
      htlc.sender,
      htlc.srcReceiver,
      htlc.redeemed,
      htlc.unlocked
    );
  }

  function getCommitDetails(
    uint commitId
  )
    public
    view
    returns (
      string memory dstAddress,
      string memory srcAsset,
      address payable sender,
      address payable srcReceiver,
      uint timelock,
      address messenger,
      uint amount,
      bool uncommitted,
      bool locked
    )
  {
    if (!hasPHTLC(commitId)) {
      return ('0', '0', payable(address(0)), payable(address(0)), 0, address(0), 0, false, false);
    }
    PHTLC storage phtlc = commits[commitId];
    return (
      phtlc.dstAddress,
      phtlc.srcAsset,
      phtlc.sender,
      phtlc.srcReceiver,
      phtlc.timelock,
      phtlc.messenger,
      phtlc.amount,
      phtlc.uncommitted,
      phtlc.locked
    );
  }

  function hasPHTLC(uint commitId) internal view returns (bool exists) {
    exists = (commitId <= id);
  }

  function hasHTLC(bytes32 lockId) internal view returns (bool exists) {
    exists = (locks[lockId].sender != address(0));
  }

  function getLocks(address senderAddr) public view returns (bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < lockIds.length; i++) {
      HTLC memory htlc = locks[lockIds[i]];
      if (htlc.sender == senderAddr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < lockIds.length; i++) {
      if (locks[lockIds[i]].sender == senderAddr) {
        result[j] = lockIds[i];
        j++;
      }
    }

    return result;
  }

  function getCommits(address senderAddr) public view returns (uint[] memory) {
    uint count = 0;

    for (uint i = 1; i < id + 1; i++) {
      PHTLC memory phtlc = commits[i];
      if (phtlc.sender == senderAddr) {
        count++;
      }
    }

    uint[] memory result = new uint[](count);
    uint j = 0;

    for (uint i = 1; i < id + 1; i++) {
      if (commits[i].sender == senderAddr) {
        result[j] = i;
        j++;
      }
    }

    return result;
  }
}
