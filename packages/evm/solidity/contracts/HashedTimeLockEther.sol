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
import '@openzeppelin/contracts/utils/Address.sol';

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

contract LayerswapV8 {
  using ECDSA for bytes32;
  using Address for address;

  bytes32 private DOMAIN_SEPARATOR;
  bytes32 private constant SALT = keccak256(abi.encodePacked('Layerswap V8'));

  constructor() {
    DOMAIN_SEPARATOR = hashDomain(
      EIP712Domain({
        name: 'LayerswapV8',
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
  error AlreadyLocked();
  error AlreadyUncommitted();
  error NoAllowance();
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
    bool locked;
    bool uncommitted;
  }

  struct lockCommitmentMsg {
    bytes32 hashlock;
    uint256 timelock;
  }

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
    bytes32 commitId
  );

  event LowLevelErrorOccurred(bytes lowLevelData);
  event TokenUnlocked(bytes32 indexed lockId);
  event TokenUncommitted(bytes32 indexed commitId);
  event TokenRedeemed(bytes32 indexed lockId, address redeemAddress);

  modifier _committed(bytes32 commitId) {
    if (!hasPHTLC(commitId)) revert CommitmentNotExists();
    _;
  }

  modifier _locked(bytes32 lockId) {
    if (!hasHTLC(lockId)) revert LockNotExists();
    _;
  }

  mapping(bytes32 => HTLC) locks;
  mapping(bytes32 => PHTLC) commits;
  mapping(bytes32 => bytes32) commitIdToLockId;
  bytes32[] lockIds;
  bytes32[] commitIds;
  bytes32 blockHash = blockhash(block.number - 1);
  uint256 blockHashAsUint = uint256(blockHash);
  uint256 contractNonce = 0;

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
    address messenger
  ) external payable returns (bytes32 commitId) {
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
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
      msg.value,
      messenger,
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
      msg.value,
      timelock,
      messenger
    );
  }

  function uncommit(bytes32 commitId) external _committed(commitId) returns (bool) {
    PHTLC storage phtlc = commits[commitId];

    if (phtlc.uncommitted) revert AlreadyUncommitted();
    if (phtlc.locked) revert AlreadyLocked();
    if (phtlc.timelock > block.timestamp) revert NotPassedTimelock();

    phtlc.uncommitted = true;
    (bool success, ) = phtlc.sender.call{ value: phtlc.amount }('');
    require(success, 'Transfer failed');
    emit TokenUncommitted(commitId);
    return true;
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
        commitId
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

  function lock(
    bytes32 hashlock,
    uint256 timelock,
    address payable srcReceiver,
    string memory srcAsset,
    string memory dstChain,
    string memory dstAddress,
    string memory dstAsset,
    bytes32 commitId,
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
    commitIdToLockId[commitId] = lockId;
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

  function redeem(bytes32 lockId, uint256 secret) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    if (htlc.hashlock != sha256(abi.encodePacked(secret))) revert HashlockNotMatch();
    if (htlc.unlocked) revert AlreadyUnlocked();
    if (htlc.redeemed) revert AlreadyRedeemed();

    htlc.secret = secret;
    htlc.redeemed = true;
    (bool success, ) = htlc.srcReceiver.call{ value: htlc.amount }('');
    require(success, 'Transfer failed');
    emit TokenRedeemed(lockId, msg.sender);
    return true;
  }

  function unlock(bytes32 lockId) external _locked(lockId) returns (bool) {
    HTLC storage htlc = locks[lockId];

    if (htlc.unlocked) revert AlreadyUnlocked();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.unlocked = true;
    (bool success, ) = htlc.sender.call{ value: htlc.amount }('');
    require(success, 'Transfer failed');
    emit TokenUnlocked(lockId);
    return true;
  }

  function getLockDetails(bytes32 lockId) public view returns (HTLC memory) {
    if (!hasHTLC(lockId)) {
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
      PHTLC memory emptyPHTLC = PHTLC({
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
        locked: false,
        uncommitted: false
      });
      return emptyPHTLC;
    }
    PHTLC storage phtlc = commits[commitId];
    return phtlc;
  }

  function hasPHTLC(bytes32 commitId) internal view returns (bool exists) {
    exists = (commits[commitId].sender != address(0));
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
