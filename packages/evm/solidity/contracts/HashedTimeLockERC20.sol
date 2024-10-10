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
 *  3) refund() - after timelock has expired and if the srcReceiver did not
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
    bool redeemed;
    bool refunded;
  }

  struct addLockMsg {
    bytes32 Id;
    bytes32 hashlock;
    uint256 timelock;
  }

  using SafeERC20 for IERC20;
  mapping(bytes32 => HTLC) contracts;
  bytes32[] contractIds;
  uint256 blockHashAsUint = uint256(blockhash(block.number - 1));
  uint256 contractNonce = 0;

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
    uint amount,
    uint timelock,
    address tokenContract
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
    uint amount,
    uint timelock,
    address tokenContract
  );

  event TokenLockAdded(bytes32 Id, bytes32 hashlock, uint256 timelock);
  event TokenRedeemed(bytes32 indexed Id, address redeemAddress);
  event TokenRefunded(bytes32 indexed Id);
  event LowLevelErrorOccurred(bytes lowLevelData);

  modifier _exists(bytes32 Id) {
    require(hasHTLC(Id),"HTLC Not Exists");
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
    uint amount,
    address tokenContract
  ) external returns (bytes32 Id) {
    require(amount > 0,"Funds Not Sent");
    require(timelock > block.timestamp,"Not Future Timelock");

    IERC20 token = IERC20(tokenContract);

    require(token.balanceOf(msg.sender) >= amount,"Insufficient Balance");
    require(token.allowance(msg.sender, address(this)) >= amount,"No Allowance");
    token.safeTransferFrom(msg.sender, address(this), amount);

    contractNonce += 1;
    Id = bytes32(blockHashAsUint ^ contractNonce);

    //Remove this check; the ID is guaranteed to be unique.
    require(!hasHTLC(Id),"HTLC Already Exists");
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
      amount,
      uint256(0),
      tokenContract,
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
      tokenContract
    );
  }

  function addLock(bytes32 Id, bytes32 hashlock, uint256 timelock) external _exists(Id) returns (bytes32) {
    HTLC storage htlc = contracts[Id];
    require(!htlc.refunded,"Already Refunded");
    require(timelock > block.timestamp,"Not Future Timelock");
    if (msg.sender == htlc.sender || msg.sender == address(this)) {
      if (htlc.hashlock == 0) {
        htlc.hashlock = hashlock;
        htlc.timelock = timelock;
      } else {
          require(false,"Hashlock Already Set");
      }
      emit TokenLockAdded(Id, hashlock, timelock);
      return Id;
    } else {
          require(false,"No Allowance"); 
    }
  }

  function addLockSig(addLockMsg memory message, uint8 v, bytes32 r, bytes32 s) external returns (bytes32) {
    if (verifyMessage(message, v, r, s)) {
      return this.addLock(message.Id, message.hashlock, message.timelock);
    } else {
      require(false,"Invalid Signiture");
    }
  }

  /**
   * @dev Sender / Payer sets up a new hash time lock contract depositing the
   * funds and providing the reciever and terms.
   * @param srcReceiver srcReceiver of the funds.
   * @param hashlock A sha-256 hash hashlock.
   * @param timelock UNIX epoch seconds time that the lock expires at.
   *                  unlocks can be made after this time.
   * @return Id Id of the new HTLC. This is needed for subsequent
   *                    calls.
   */

  function lock(
    bytes32 Id,
    bytes32 hashlock,
    uint256 timelock,
    address srcReceiver,
    string memory srcAsset,
    string memory dstChain,
    string memory dstAddress,
    string memory dstAsset,
    uint256 amount,
    address tokenContract
  ) external returns (bytes32) {
    require(amount > 0, "Funds Not Sent");
    require(timelock > block.timestamp,"Not Future Timelock");
    require(!hasHTLC(Id),"HTLC Already Exists");
    IERC20 token = IERC20(tokenContract);

    require(token.balanceOf(msg.sender) >= amount,"Insufficient Balance");
    require(token.allowance(msg.sender, address(this)) >= amount,"No Allowance");

    token.safeTransferFrom(msg.sender, address(this), amount);
    contracts[Id] = HTLC(
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
      amount,
      timelock,
      tokenContract
    );
    return Id;
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

    require(htlc.hashlock == sha256(abi.encodePacked(secret)),"Hashlock Not Match");
    require(!htlc.refunded,"Already Refunded");
    require(!htlc.redeemed,"Already Redeemed");

    htlc.secret = secret;
    htlc.redeemed = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.srcReceiver, htlc.amount);
    emit TokenRedeemed(Id, msg.sender);
    return true;
  }

  /**
   * @dev Called by the sender if there was no redeem AND the time lock has
   * expired. This will refund the contract amount.
   * @param Id Id of HTLC to refund from.
   * @return bool true on success
   */
  function refund(bytes32 Id) external _exists(Id) returns (bool) {
    HTLC storage htlc = contracts[Id];
    require(!htlc.refunded,"Already Refunded");
    require(!htlc.redeemed,"Already Redeemed");
    require(htlc.timelock <= block.timestamp,"Not Passed Timelock");

    htlc.refunded = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.sender, htlc.amount);
    emit TokenRefunded(Id);
    return true;
  }

  /**
   * @dev Get contract details.
   * @param Id HTLC contract id
   */
  function getDetails(bytes32 Id) external view returns (HTLC memory) {
    return contracts[Id];
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param Id Id into contracts mapping.
   */
  function hasHTLC(bytes32 Id) internal view returns (bool exists) {
    exists = (contracts[Id].sender != address(0));
  }

  function getContracts(address senderAddr) public view returns (bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < contractIds.length; i++) {
      HTLC memory htlc = contracts[contractIds[i]];
      if (htlc.sender == senderAddr) {
        count++;
      }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < contractIds.length; i++) {
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
}
