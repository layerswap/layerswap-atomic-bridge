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
 * @title Hashed Timelock contracts (HTLCs) on Ethereum ERC20 tokens.
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
    bytes32 srcId,
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
  error HTLCAlreadyExists();
  error HTLCNotExists();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyUnlocked();
  error NoMessenger();
  error IncorrectData();
  error InsufficientBalance();
  error NoAllowance();
  error AlreadyLocked();
  error InvalidSigniture();
  error HashlockAlreadySet();

  struct HTLC {
    string dstAddress;
    string dstChain;
    string dstAsset;
    string srcAsset;
    address payable sender;
    address payable srcReceiver;
    bytes32 hashlock;
    uint256 timelock;
    uint256 amount;
    uint256 secret;
    address tokenContract;
    address messenger;
    bool redeemed;
    bool unlocked;
  }

  struct lockCommitmentMsg {
    bytes32 hashlock;
    uint256 timelock;
  }

  using SafeERC20 for IERC20;
  mapping(bytes32 => HTLC) contracts;
  mapping(bytes32 => bytes32) srcIdToId;
  bytes32[] lockIds;
  bytes32[] commitIds;
  uint256 blockHashAsUint = uint256(blockhash(block.number - 1));
  uint256 contractNonce = 0;

  event TokenCommitted(
    bytes32 Id,
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
    bytes32 srcId,
    address tokenContract
  );

  event TokenLockCommitted(bytes32 Id, address messenger, bytes32 hashlock, uint256 timelock);
  event TokenRedeemed(bytes32 indexed Id, address redeemAddress);
  event TokenUnlocked(bytes32 indexed Id);
  event LowLevelErrorOccurred(bytes lowLevelData);

  modifier _exists(bytes32 Id) {
    if (!hasHTLC(Id)) revert HTLCNotExists();
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
  ) external returns (bytes32 Id) {
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
    Id = bytes32(blockHashAsUint ^ contractNonce);
    if (hasHTLC(Id)) {
      revert HTLCAlreadyExists();
    }
    commitIds.push(Id);
    contracts[Id] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      bytes32(0),
      timelock,
      amount,
      uint256(0),
      tokenContract,
      messenger,
      false,
      false
    );

    emit TokenCommitted(
      Id,
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

  function lockCommitment(bytes32 Id, bytes32 hashlock, uint256 timelock) external _exists(Id) returns (bytes32) {
    HTLC storage htlc = contracts[Id];
    if (htlc.unlocked == true) {
      revert AlreadyUnlocked();
    }
    if (hasHTLC(hashlock)) {
      revert LockAlreadyExists();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    if (msg.sender == htlc.sender || msg.sender == htlc.messenger || msg.sender == address(this)) {
      if (htlc.hashlock == 0) {
        htlc.hashlock = hashlock;
        htlc.timelock = timelock;
      } else {
        revert HashlockAlreadySet();
      }
      lockIds.push(hashlock);
      emit TokenLockCommitted(Id, msg.sender, hashlock, timelock);
      return hashlock;
    } else {
      revert NoAllowance();
    }
  }

  function lockCommitmentSig(
    bytes32 Id,
    lockCommitmentMsg memory message,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external _exists(Id) returns (bytes32 lockId) {
    if (verifyMessage(msg.sender, message, v, r, s)) {
      lockId = this.lockCommitment(Id, message.hashlock, message.timelock);
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
    bytes32 srcId,
    address messenger,
    uint256 amount,
    address tokenContract
  ) external returns (bytes32) {
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    if (amount == 0) {
      revert FundsNotSent();
    }
    if (hasHTLC(hashlock)) {
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
    contracts[hashlock] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      hashlock,
      timelock,
      amount,
      0x0,
      tokenContract,
      messenger,
      false,
      false
    );

    lockIds.push(hashlock);
    srcIdToId[srcId] = hashlock;
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
      srcId,
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
            srcId,
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
    return hashlock;
  }

  /**
   * @dev Called by the srcReceiver once they know the secret of the hashlock.
   * This will transfer the locked funds to their address.
   *
   * @param Id Id of the HTLC.
   * @param secret sha256(secret) should equal the contract hashlock.
   * @return bool true on success
   */
  function redeem(bytes32 Id, uint256 secret) external _exists(Id) returns (bool) {
    HTLC storage htlc = contracts[Id];

    if (htlc.hashlock != sha256(abi.encodePacked(secret))) revert HashlockNotMatch();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.unlocked) revert AlreadyUnlocked();

    htlc.secret = secret;
    htlc.redeemed = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.srcReceiver, htlc.amount);
    emit TokenRedeemed(Id, msg.sender);
    return true;
  }

  /**
   * @dev Called by the sender if there was no redeem AND the time lock has
   * expired. This will unlock the contract amount.
   * @param Id Id of HTLC to unlock from.
   * @return bool true on success
   */
  function unlock(bytes32 Id) external _exists(Id) returns (bool) {
    HTLC storage htlc = contracts[Id];

    if (htlc.unlocked) revert AlreadyUnlocked();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.unlocked = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.sender, htlc.amount);
    emit TokenUnlocked(Id);
    return true;
  }

  /**
   * @dev Get contract details.
   * @param lockId HTLC contract id
   */
  function getLockDetails(bytes32 lockId) external view returns (HTLC memory) {
    return contracts[lockId];
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param Id Id into contracts mapping.
   */
  function hasHTLC(bytes32 Id) internal view returns (bool exists) {
    exists = (contracts[Id].sender != address(0));
  }

  function getLocks(address senderAddr) public view returns (bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < lockIds.length; i++) {
      HTLC memory htlc = contracts[lockIds[i]];
      if (htlc.sender == senderAddr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < lockIds.length; i++) {
      if (contracts[lockIds[i]].sender == senderAddr) {
        result[j] = lockIds[i];
        j++;
      }
    }

    return result;
  }

  function getCommits(address senderAddr) public view returns (bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < commitIds.length; i++) {
      HTLC memory htlc = contracts[commitIds[i]];
      if (htlc.sender == senderAddr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < commitIds.length; i++) {
      if (contracts[commitIds[i]].sender == senderAddr) {
        result[j] = commitIds[i];
        j++;
      }
    }

    return result;
  }

  function getIdBySrcId(bytes32 Id) public view returns (bytes32) {
    return srcIdToId[Id];
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
