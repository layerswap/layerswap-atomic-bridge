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

// Domain separator ensures signatures are unique to this contract and chain, preventing replay attacks.
struct EIP712Domain {
  string name;
  string version;
  uint256 chainId;
  address verifyingContract;
  bytes32 salt;
}

// Interface for Messenger, to be notified when LP locks funds, with this address specified as the messenger.
interface IMessenger {
  function notify(
    bytes32 Id,
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
  error HTLCAlreadyExists();
  error HTLCNotExists();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyRefunded();
  error NoMessenger();
  error AlreadyLocked();
  error NoAllowance();
  error InvalidSigniture();
  error HashlockAlreadySet();

  // Structure for storing swap-related data
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
    address messenger;
    bool redeemed;
    bool refunded;
  }

  struct addLockMsg {
    bytes32 Id;
    bytes32 hashlock;
    uint256 timelock;
  }

  event TokenCommitted(
    bytes32 indexed Id,
    string[] hopChains,
    string[] hopAssets,
    string[] hopAddresses,
    string dstChain,
    string dstAddress,
    string dstAsset,
    address indexed sender,
    address indexed srcReceiver,
    string srcAsset,
    uint256 amount,
    uint256 timelock,
    address messenger
  );
  event TokenLocked(
    bytes32 indexed Id,
    bytes32 hashlock,
    string dstChain,
    string dstAddress,
    string dstAsset,
    address indexed sender,
    address indexed srcReceiver,
    string srcAsset,
    uint256 amount,
    uint256 timelock,
    address messenger
  );

  event TokenLockAdded(bytes32 indexed Id, address messenger, bytes32 hashlock, uint256 timelock);
  event TokenRefunded(bytes32 indexed Id);
  event TokenRedeemed(bytes32 indexed Id, address redeemAddress);
  event LowLevelErrorOccurred(bytes lowLevelData);

  modifier _exists(bytes32 Id) {
    if (!hasHTLC(Id)) revert HTLCNotExists();
    _;
  }

  mapping(bytes32 => HTLC) contracts;
  bytes32[] contractIds;
  uint256 blockHashAsUint = uint256(blockhash(block.number - 1));
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
    uint256 timelock,
    address messenger
  ) external payable returns (bytes32 Id) {
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    contractNonce += 1;
    Id = bytes32(blockHashAsUint ^ contractNonce);

    //Remove this check; the ID is guaranteed to be unique.
    if (hasHTLC(Id)) {
      revert HTLCAlreadyExists();
    }
    contractIds.push(Id);
    contracts[Id] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      payable(srcReceiver),
      bytes32(0),
      timelock,
      msg.value,
      uint256(0),
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
      msg.value,
      timelock,
      messenger
    );
  }

  function refund(bytes32 Id) external _exists(Id) returns (bool) {
    HTLC storage htlc = contracts[Id];

    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.refunded = true;
    (bool success, ) = htlc.sender.call{ value: htlc.amount }('');
    require(success, 'Transfer failed');
    emit TokenRefunded(Id);
    return true;
  }

  function addLock(bytes32 Id, bytes32 hashlock, uint256 timelock) external _exists(Id) returns (bytes32) {
    HTLC storage htlc = contracts[Id];
    if (htlc.refunded == true) {
      revert AlreadyRefunded();
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

      // DISCLAIMER: `tx.origin` is used in this event, but it can be misleading as it tracks the
      // original transaction sender, which could be different from the expected sender in complex
      // flows (e.g., a -> ... -> b -> c where the actual sender is b in event will be emitted a)
      emit TokenLockAdded(Id, tx.origin, hashlock, timelock);
      return Id;
    } else {
      revert NoAllowance();
    }
  }

  function addLockSig(addLockMsg memory message, uint8 v, bytes32 r, bytes32 s) external returns (bytes32) {
    if (verifyMessage(message, v, r, s)) {
      return this.addLock(message.Id, message.hashlock, message.timelock);
    } else {
      revert InvalidSigniture();
    }
  }

  function lock(
    bytes32 Id,
    bytes32 hashlock,
    uint256 timelock,
    address payable srcReceiver,
    string memory srcAsset,
    string memory dstChain,
    string memory dstAddress,
    string memory dstAsset,
    address messenger
  ) external payable returns (bytes32) {
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    if (hasHTLC(Id)) {
      revert HTLCAlreadyExists();
    }
    contracts[Id] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      srcReceiver,
      hashlock,
      timelock,
      msg.value,
      uint256(0),
      messenger,
      false,
      false
    );
    contractIds.push(Id);
    emit TokenLocked(
      Id,
      hashlock,
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

    if (messenger != address(0)) {
      uint256 codeSize;
      assembly {
        codeSize := extcodesize(messenger)
      }
      if (codeSize > 0) {
        try
          IMessenger(messenger).notify(
            Id,
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
    return Id;
  }

  function redeem(bytes32 Id, uint256 secret) external _exists(Id) returns (bool) {
    HTLC storage htlc = contracts[Id];

    if (htlc.hashlock != sha256(abi.encodePacked(secret))) revert HashlockNotMatch();
    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();

    htlc.secret = secret;
    htlc.redeemed = true;
    (bool success, ) = htlc.srcReceiver.call{ value: htlc.amount }('');
    require(success, 'Transfer failed');
    emit TokenRedeemed(Id, msg.sender);
    return true;
  }

  function getDetails(bytes32 Id) public view returns (HTLC memory) {
    return contracts[Id];
  }

  function getContracts(address senderAddr) public view returns (bytes32[] memory) {
    uint256 count = 0;

    for (uint256 i = 0; i < contractIds.length; i++) {
      HTLC memory htlc = contracts[contractIds[i]];
      if (htlc.sender == senderAddr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint256 j = 0;

    for (uint256 i = 0; i < contractIds.length; i++) {
      if (contracts[contractIds[i]].sender == senderAddr) {
        result[j] = contractIds[i];
        j++;
      }
    }

    return result;
  }

  function hashDomain(EIP712Domain memory domain) private pure returns (bytes32) {
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
  function hashMessage(addLockMsg memory message) private pure returns (bytes32) {
    return
      keccak256(
        abi.encode(
          keccak256('addLockMsg(bytes32 Id,bytes32 hashlock,uint256 timelock)'),
          message.Id,
          message.hashlock,
          message.timelock
        )
      );
  }

  // Verifies an EIP712 message signature
  function verifyMessage(addLockMsg memory message, uint8 v, bytes32 r, bytes32 s) private view returns (bool) {
    bytes32 digest = keccak256(abi.encodePacked('\x19\x01', DOMAIN_SEPARATOR, hashMessage(message)));

    address recoveredAddress = ecrecover(digest, v, r, s);

    return (recoveredAddress == contracts[message.Id].sender);
  }

  function hasHTLC(bytes32 Id) internal view returns (bool exists) {
    exists = (contracts[Id].sender != address(0));
  }
}
