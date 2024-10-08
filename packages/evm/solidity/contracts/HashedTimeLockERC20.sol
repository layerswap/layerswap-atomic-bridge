/*
_                                                 __     _____ 
| |    __ _ _   _  ___ _ __ _____      ____ _ _ __ \ \   / ( _ )
| |   / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \ \ \ / // _ \
| |__| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | \ V /| (_) |
|_____\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/   \_/  \___/
            |___/                            |_|

*/

// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';
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
struct EIP712Domain {
  string name;
  string version;
  uint256 chainId;
  address verifyingContract;
  bytes32 salt;
}

interface IMessenger {
  function notify(
    bytes32 commitId,
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

contract LayerswapV8ERC20 {
  using ECDSA for bytes32;
  using Address for address;

  bytes32 private DOMAIN_SEPARATOR;
  bytes32 private constant SALT = keccak256(abi.encodePacked('Layerswap V8'));

  constructor() {
    DOMAIN_SEPARATOR = hashDomain(
      EIP712Domain({
        name: 'LayerswapV8ERC20',
        version: '1',
        chainId: block.chainid,
        verifyingContract: address(this),
        salt: SALT
      })
    );
  }

  error FundsNotSent();
  error NotFutureTimelock();
  error NotPassedTimelock();
  error LockAlreadyExists();
  error CommitIdAlreadyExists();
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
  error InvalidSigniture();

  struct HTLC {
    string dstAddress;
    string dstChain;
    string dstAsset;
    string srcAsset;
    address payable sender;
    address payable srcReceiver;
    bytes32 hashlock;
    uint256 secret;
    uint256 amount;
    uint256 timelock;
    address tokenContract;
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
    bytes32 lockId;
    uint timelock;
    uint amount;
    address messenger;
    address tokenContract;
    bool locked;
    bool uncommitted;
  }

  struct lockCommitmentMsg {
    bytes32 hashlock;
    uint256 timelock;
  }

  using SafeERC20 for IERC20;
  mapping(bytes32 => HTLC) locks;
  mapping(bytes32 => PHTLC) commits;
  mapping(bytes32 => bytes32) commitIdToLockId;
  bytes32[] lockIds;
  bytes32[] commitIds;
  bytes32 blockHash = blockhash(block.number - 1);
  uint256 blockHashAsUint = uint256(blockHash);
  uint256 contractNonce = 0;

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
    bytes32 commitId,
    address tokenContract
  );
  event TokenRedeemed(bytes32 indexed lockId, address redeemAddress);
  event TokenUnlocked(bytes32 indexed lockId);

  event TokenCommitted(
    bytes32 commitId,
    string[] hopChains,
    string[] hopAssets,
    string[] hopAddresses,
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
  event TokenUncommitted(bytes32 indexed commitId);

  modifier _committed(bytes32 commitId) {
    if (!hasPHTLC(commitId)) revert CommitmentNotExists();
    _;
  }

  modifier _locked(bytes32 lockId) {
    if (!hasHTLC(lockId)) revert LockNotExists();
    _;
  }

  function commit(
    string[] memory hopChains,
    string[] memory hopAssets,
    string[] memory hopAddresses,
    string memory dstChain,
    string memory dstAsset,
    string memory dstAddress,
    string memory srcAsset,
    address srcReceiver,
    uint timelock,
    address messenger,
    uint amount,
    address tokenContract
  ) external payable returns (bytes32 commitId) {
    if (amount == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    IERC20 token = IERC20(tokenContract);

    if (token.balanceOf(msg.sender) < amount) {
      revert InsufficientBalance();
    }

    if (token.allowance(msg.sender, address(this)) < amount) {
      revert NoAllowance();
    }

    token.safeTransferFrom(msg.sender, address(this), amount);

    contractNonce += 1;
    commitId = bytes32(blockHashAsUint ^ contractNonce);
    if (hasPHTLC(commitId)) {
      revert CommitIdAlreadyExists();
    }
    commitIds.push(commitId);
    commits[commitId] = PHTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      bytes32(0),
      timelock,
      amount,
      messenger,
      tokenContract,
      false,
      false
    );
    emit TokenCommitted(
      commitId,
      hopChains,
      hopAssets,
      hopAddresses,
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

  function lockCommitment(
    bytes32 commitId,
    bytes32 hashlock,
    uint256 timelock
  ) external _committed(commitId) returns (bytes32 lockId) {
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
    if (
      msg.sender == commits[commitId].sender || msg.sender == commits[commitId].messenger || msg.sender == address(this)
    ) {
      commits[commitId].locked = true;
      commits[commitId].lockId = hashlock;
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
        timelock,
        commits[commitId].tokenContract,
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
        timelock,
        commits[commitId].messenger,
        commitId,
        commits[commitId].tokenContract
      );
    } else {
      revert NoAllowance();
    }
  }

  function lockCommitmentSig(
    bytes32 commitId,
    lockCommitmentMsg memory message,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external _committed(commitId) returns (bytes32 lockId) {
    if (verifyMessage(msg.sender, message, v, r, s)) {
      lockId = this.lockCommitment(commitId, message.hashlock, message.timelock);
      return lockId;
    } else {
      revert InvalidSigniture();
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
    bytes32 commitId,
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
      tokenContract,
      false,
      false
    );
    lockIds.push(hashlock);
    commitIdToLockId[commitId] = lockId;
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
  function redeem(bytes32 lockId, uint256 secret) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    if (htlc.hashlock != sha256(abi.encodePacked(secret))) revert HashlockNotMatch();
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

  function uncommit(bytes32 commitId) external _committed(commitId) returns (bool) {
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
  function getLockDetails(bytes32 lockId) external view returns (HTLC memory) {
    if (hasHTLC(lockId) == false) {
      HTLC memory emptyHTLC = HTLC({
        dstAddress: '',
        dstChain: '',
        dstAsset: '',
        srcAsset: '',
        sender: payable(address(0)),
        srcReceiver: payable(address(0)),
        hashlock: bytes32(0x0),
        secret: uint256(0),
        amount: uint256(0),
        timelock: uint256(0),
        tokenContract: address(0),
        redeemed: false,
        unlocked: false
      });
      return emptyHTLC;
    }
    HTLC storage htlc = locks[lockId];
    return htlc;
  }

  function getCommitDetails(bytes32 commitId) public view returns (PHTLC memory) {
    if (!hasPHTLC(commitId)) {
      PHTLC memory empyPHTLC = PHTLC({
        dstAddress: '',
        dstChain: '',
        dstAsset: '',
        srcAsset: '',
        sender: payable(address(0)),
        srcReceiver: payable(address(0)),
        lockId: bytes32(0),
        timelock: uint256(0),
        amount: uint256(0),
        messenger: address(0),
        tokenContract: address(0),
        locked: false,
        uncommitted: false
      });
      return empyPHTLC;
    }
    PHTLC storage phtlc = commits[commitId];
    return phtlc;
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param lockId Id into locks mapping.
   */
  function hasHTLC(bytes32 lockId) internal view returns (bool exists) {
    exists = (locks[lockId].sender != address(0));
  }

  function hasPHTLC(bytes32 commitId) internal view returns (bool exists) {
    exists = (commits[commitId].sender != address(0));
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

  function getCommits(address senderAddr) public view returns (bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < commitIds.length; i++) {
      PHTLC memory phtlc = commits[commitIds[i]];
      if (phtlc.sender == senderAddr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < commitIds.length; i++) {
      if (commits[commitIds[i]].sender == senderAddr) {
        result[j] = commitIds[i];
        j++;
      }
    }

    return result;
  }

  function getLockIdByCommitId(bytes32 commitId) public view returns (bytes32) {
    return commitIdToLockId[commitId];
  }

  function hashDomain(EIP712Domain memory domain) public pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)'),
          keccak256(bytes(domain.name)),
          keccak256(bytes(domain.version)),
          domain.chainId,
          domain.verifyingContract,
          domain.salt
        )
      );
  }

  // Hashes an EIP712 message struct
  function hashMessage(lockCommitmentMsg memory message) public pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          keccak256('lockCommitmentMsg(bytes32 hashlock,uint256 timelock)'),
          message.hashlock,
          message.timelock
        )
      );
  }

  // Verifies an EIP712 message signature
  function verifyMessage(
    address sender,
    lockCommitmentMsg memory message,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) public view returns (bool) {
    bytes32 digest = keccak256(abi.encodePacked('\x19\x01', DOMAIN_SEPARATOR, hashMessage(message)));

    address recoveredAddress = ecrecover(digest, v, r, s);

    return (recoveredAddress == sender);
  }
}
