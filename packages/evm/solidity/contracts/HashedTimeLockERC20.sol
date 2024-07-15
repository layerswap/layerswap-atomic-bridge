// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @title Hashed Timelock locks (HTLCs) on Ethereum ERC20 tokens.
 *
 * This contract provides a way to lock and keep HTLCs for ERC20 tokens.
 *
 * Protocol:
 *
 *  1) lock(srcReceiver, hashlock, timelock, tokenContract, amount) - a
 *      sender calls this to lock a new HTLC on a given token (tokenContract)
 *       for a given amount. A 32 byte contract id is returned
 *  2) redeem(contractId, secret) - once the srcReceiver knows the secret of
 *      the hashlock hash they can claim the tokens with this function
 *  3) unlock() - after timelock has expired and if the srcReceiver did not
 *      redeem the tokens the sender / creator of the HTLC can get their tokens
 *      back with this function.
 */

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

contract HashedTimeLockERC20 {
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
  error IncorrectData();
  error InsufficientBalance();
  error NoAllowance();
  error AlreadyLocked();
  error AlreadyUncommitted();

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
    address tokenContract;
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
    address tokenContract;
  }

  using SafeERC20 for IERC20;
  mapping(bytes32 => HTLC) locks;
  mapping(uint256 => PHTLC) commits;
  bytes32[] lockIds;
  uint256 id = 0;

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
    uint commitId,
    address tokenContract
  );
  event TokenRedeemed(bytes32 indexed lockId, address redeemAddress);
  event TokenUnlocked(bytes32 indexed lockId);

  event TokenCommitted(
    uint commitId,
    string[] HopChains,
    string[] HopAssets,
    string[] HopAdresses,
    string dstChain,
    string dstAddress,
    string dstAsset,
    address sender,
    address srcReceiver,
    string srcAsset,
    uint amount,
    uint timelock,
    address messenger,
    address tokenContract
  );

  event LowLevelErrorOccurred(bytes lowLevelData);
  event TokenUncommitted(uint indexed commitId);

  modifier _committed(uint _commitId) {
    if (!hasPHTLC(_commitId)) revert CommitmentNotExists();
    _;
  }

  modifier _locked(bytes32 lockId) {
    if (!hasHTLC(lockId)) revert LockNotExists();
    _;
  }

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
    address messenger,
    uint amount,
    address tokenContract
  ) external payable returns (uint commitId) {
    if (amount == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    IERC20 token = IERC20(tokenContract);
    id += 1;
    commitId = id;

    if (token.balanceOf(msg.sender) < amount) {
      revert InsufficientBalance();
    }

    if (token.allowance(msg.sender, address(this)) < amount) {
      revert NoAllowance();
    }

    token.safeTransferFrom(msg.sender, address(this), amount);

    commits[commitId] = PHTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      timelock,
      amount,
      messenger,
      false,
      false,
      tokenContract
    );
    emit TokenCommitted(
      commitId,
      HopChains,
      HopAssets,
      HopAddresses,
      dstChain,
      dstAddress,
      dstAsset,
      msg.sender,
      srcReceiver,
      srcAsset,
      amount,
      timelock,
      messenger,
      tokenContract
    );
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
        false,
        commits[commitId].tokenContract
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
        commitId,
        commits[commitId].tokenContract
      );
    } else {
      revert NoAllowance();
    }
  }

  /**
   * @dev Sender / Payer sets up a new hash time lock contract depositing the
   * funds and providing the reciever and terms.
   * @param srcReceiver srcReceiver of the funds.
   * @param hashlock A sha-256 hash hashlock.
   * @param timelock UNIX epoch seconds time that the lock expires at.
   *                  unlocks can be made after this time.
   * @return lockId Id of the new HTLC. This is needed for subsequent
   *                    calls.
   */

  function lock(
    bytes32 hashlock,
    uint256 timelock,
    address srcReceiver,
    string memory srcAsset,
    string memory dstChain,
    string memory dstAddress,
    string memory dstAsset,
    uint256 commitId,
    address messenger,
    uint256 amount,
    address tokenContract
  ) external returns (bytes32 lockId) {
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    if (amount == 0) {
      revert FundsNotSent();
    }
    lockId = hashlock;

    if (hasHTLC(lockId)) {
      revert LockAlreadyExists();
    }
    IERC20 token = IERC20(tokenContract);

    if (token.balanceOf(msg.sender) < amount) {
      revert InsufficientBalance();
    }

    if (token.allowance(msg.sender, address(this)) < amount) {
      revert NoAllowance();
    }

    token.safeTransferFrom(msg.sender, address(this), amount);
    locks[lockId] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      hashlock,
      0x0,
      amount,
      timelock,
      false,
      false,
      tokenContract
    );
    lockIds.push(hashlock);
    emit TokenLocked(
      hashlock,
      dstChain,
      dstAddress,
      dstAsset,
      msg.sender,
      srcReceiver,
      srcAsset,
      amount,
      timelock,
      messenger,
      commitId,
      tokenContract
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
            payable(srcReceiver),
            amount,
            timelock,
            tokenContract
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

  /**
   * @dev Called by the srcReceiver once they know the secret of the hashlock.
   * This will transfer the locked funds to their address.
   *
   * @param lockId Id of the HTLC.
   * @param secret sha256(secret) should equal the contract hashlock.
   * @return bool true on success
   */
  function redeem(bytes32 lockId, bytes32 secret) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    bytes32 pre = sha256(abi.encodePacked(secret));
    if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.unlocked) revert AlreadyUnlocked();

    htlc.secret = secret;
    htlc.redeemed = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.srcReceiver, htlc.amount);
    emit TokenRedeemed(lockId, msg.sender);
    return true;
  }

  /**
   * @dev Called by the sender if there was no redeem AND the time lock has
   * expired. This will unlock the contract amount.
   * @param lockId Id of HTLC to unlock from.
   * @return bool true on success
   */
  function unlock(bytes32 lockId) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    if (htlc.unlocked) revert AlreadyUnlocked();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.unlocked = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.sender, htlc.amount);
    emit TokenUnlocked(lockId);
    return true;
  }

  function uncommit(uint commitId) external _committed(commitId) returns (bool) {
    PHTLC storage phtlc = commits[commitId];

    if (phtlc.uncommitted) revert AlreadyUncommitted();
    if (phtlc.locked) revert AlreadyLocked();
    if (phtlc.timelock > block.timestamp) revert NotPassedTimelock();

    phtlc.uncommitted = true;
    IERC20(phtlc.tokenContract).safeTransfer(phtlc.sender, phtlc.amount);
    emit TokenUncommitted(commitId);
    return true;
  }

  /**
   * @dev Get contract details.
   * @param lockId HTLC contract id
   */
  function getLockDetails(
    bytes32 lockId
  )
    external
    view
    returns (
      address sender,
      address srcReceiver,
      address tokenContract,
      uint256 amount,
      bytes32 hashlock,
      uint256 timelock,
      bool redeemed,
      bool unlocked,
      bytes32 secret
    )
  {
    if (hasHTLC(lockId) == false) {
      return (address(0), address(0), address(0), 0, 0, 0, false, false, 0);
    }
    HTLC storage htlc = locks[lockId];
    return (
      htlc.sender,
      htlc.srcReceiver,
      htlc.tokenContract,
      htlc.amount,
      htlc.hashlock,
      htlc.timelock,
      htlc.redeemed,
      htlc.unlocked,
      htlc.secret
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
      bool unlocked,
      bool locked,
      address tokenContract
    )
  {
    if (!hasPHTLC(commitId)) {
      return ('0', '0', payable(address(0)), payable(address(0)), 0, address(0), 0, false, false, address(0));
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
      phtlc.locked,
      phtlc.tokenContract
    );
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param lockId Id into locks mapping.
   */
  function hasHTLC(bytes32 lockId) internal view returns (bool exists) {
    exists = (locks[lockId].sender != address(0));
  }

  function hasPHTLC(uint commitId) internal view returns (bool exists) {
    exists = (commitId <= id);
  }

  function getLocks(address addr) public view returns (bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < lockIds.length; i++) {
      HTLC memory htlc = locks[lockIds[i]];
      if (htlc.sender == addr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < lockIds.length; i++) {
      if (locks[lockIds[i]].sender == addr) {
        result[j] = lockIds[i];
        j++;
      }
    }

    return result;
  }

  function getCommits(address addr) public view returns (uint[] memory) {
    uint count = 0;

    for (uint i = 1; i < id + 1; i++) {
      PHTLC memory phtlc = commits[i];
      if (phtlc.sender == addr) {
        count++;
      }
    }

    uint[] memory result = new uint[](count);
    uint j = 0;

    for (uint i = 1; i < id + 1; i++) {
      if (commits[i].sender == addr) {
        result[j] = i;
        j++;
      }
    }

    return result;
  }
}
