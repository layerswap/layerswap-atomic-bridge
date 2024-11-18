/*
_                                                 __     _____ 
| |    __ _ _   _  ___ _ __ _____      ____ _ _ __ \ \   / ( _ )
| |   / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \ \ \ / // _ \
| |__| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | \ V /| (_) |
|_____\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/   \_/  \___/
            |___/                            |_|

*/

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '@nilfoundation/smart-contracts/contracts/Nil.sol';

contract LayerswapV8 is NilBase {

  constructor() {}

  struct HTLC {
    string dstAddress;
    string dstChain;
    string dstAsset;
    string srcAsset;
    address payable sender;
    bytes senderPubKey;
    address payable srcReceiver;
    bytes32 hashlock;
    uint256 timelock;
    uint256 amount;
    uint256 secret;
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
    bytes senderPubKey,
    address indexed srcReceiver,
    string srcAsset,
    uint256 amount,
    uint256 timelock
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
    uint256 timelock
  );

  event TokenRefunded(bytes32 indexed Id);
  event TokenRedeemed(bytes32 indexed Id, address redeemAddress, uint256 secret, bytes32 hashlock);

  modifier _exists(bytes32 Id) {
    require(hasHTLC(Id), 'HTLC Not Exists');
    _;
  }

  mapping(bytes32 => HTLC) contracts;
  bytes32[] contractIds;
  uint256 blockHashAsUint = uint256(blockhash(block.number - 20));
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
    bytes memory senderPubKey,
    uint256 timelock
  ) public payable onlyInternal returns (bytes32 Id) {
    require(msg.value > 0, 'Funds Not Sent');
    require(timelock > block.number, 'Not Future Timelock');
    contractNonce += 1;
    Id = bytes32(blockHashAsUint ^ contractNonce);

    //Remove this check; the ID is guaranteed to be unique.
    require(!hasHTLC(Id), 'HTLC Already Exists');
    contractIds.push(Id);
    contracts[Id] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      senderPubKey,
      payable(srcReceiver),
      bytes32(0),
      timelock,
      msg.value,
      uint256(0),
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
      senderPubKey,
      srcReceiver,
      srcAsset,
      msg.value,
      timelock
    );
  }

  function refund(bytes32 Id) public _exists(Id) onlyInternal returns (bool) {
    HTLC storage htlc = contracts[Id];
    require(!htlc.refunded, 'Already Refunded');
    require(!htlc.redeemed, 'Already Redeemed');
    require(htlc.timelock <= block.number, 'Not Passed Timelock');

    htlc.refunded = true;

    Nil.asyncCall(htlc.sender, msg.sender, address(this), 0, Nil.FORWARD_REMAINING, htlc.amount, '');

    emit TokenRefunded(Id);
    return true;
  }

  function addLock(bytes32 Id, bytes32 hashlock, uint256 timelock) public _exists(Id) onlyInternal returns (bytes32) {
    HTLC storage htlc = contracts[Id];
    require(!htlc.refunded, 'Already Refunded');
    require(timelock > block.number, 'Not Future Timelock');

    if (msg.sender == htlc.sender || msg.sender == address(this)) {
      if (htlc.hashlock == 0) {
        htlc.hashlock = hashlock;
        htlc.timelock = timelock;
      } else {
        require(false, 'Hashlock Already Set');
      }

      emit TokenLocked(
        Id,
        hashlock,
        htlc.dstChain,
        htlc.dstAddress,
        htlc.dstAsset,
        htlc.sender,
        htlc.srcReceiver,
        htlc.srcAsset,
        htlc.amount,
        timelock
      );
      return Id;
    } else {
      require(false, 'No Allowance');
    }
  }

  function addLockSig(bytes32 Id, bytes32 hashlock, uint256 timelock, bytes memory signature) public onlyInternal returns (bytes32) {
    HTLC storage htlc = contracts[Id];
    uint256 msgHash = uint256(keccak256(abi.encodePacked(Id,hashlock,timelock)));
    
    if (Nil.validateSignature(htlc.senderPubKey, msgHash, signature)) {
      return this.addLock(Id, hashlock, timelock);
    } else {
      require(false, 'Invalid Signiture');
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
    string memory dstAsset
  ) public payable onlyInternal returns (bytes32) {
    require(msg.value > 0, 'Funds Not Sent');
    require(timelock > block.number, 'Not Future Timelock');
    require(!hasHTLC(Id), 'HTLC Already Exists');

    contracts[Id] = HTLC(
      dstAddress,
      dstChain,
      dstAsset,
      srcAsset,
      payable(msg.sender),
      "",
      srcReceiver,
      hashlock,
      timelock,
      msg.value,
      uint256(0),
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
      timelock
    );
    return Id;
  }

  function redeem(bytes32 Id, uint256 secret) public _exists(Id) onlyInternal returns (bool) {
    HTLC storage htlc = contracts[Id];

    require(htlc.hashlock == sha256(abi.encodePacked(secret)), 'Hashlock Not Match');
    require(!htlc.refunded, 'Already Refunded');
    require(!htlc.redeemed, 'Already Redeemed');

    htlc.secret = secret;
    htlc.redeemed = true;

    Nil.asyncCall(
      htlc.srcReceiver,
      msg.sender,
      address(this),
      0,
      Nil.FORWARD_REMAINING,
      htlc.amount,
      ''
    );
    emit TokenRedeemed(Id, msg.sender, secret, htlc.hashlock);
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

  function hasHTLC(bytes32 Id) internal view returns (bool exists) {
    exists = (contracts[Id].sender != address(0));
  }
}
