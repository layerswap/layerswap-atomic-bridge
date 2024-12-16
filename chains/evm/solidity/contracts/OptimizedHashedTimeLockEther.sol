/*
_                                                 __     _____ 
| |    __ _ _   _  ___ _ __ _____      ____ _ _ __ \ \   / ( _ )
| |   / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \ \ \ / // _ \
| |__| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | \ V /| (_) |
|_____\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/   \_/  \___/
            |___/                            |_|

*/

// SPDX-License-Identifier:MIT
pragma solidity 0.8.23;
import '@openzeppelin/contracts/utils/cryptography/ECDSA.sol';

contract LayerswapV8Optimized{
    using ECDSA for bytes32;

    // Domain separator ensures signatures are unique to this contract and chain, preventing replay attacks.
    struct EIP712Domain {
    string name;
    string version;
    uint256 chainId;
    address verifyingContract;
    bytes32 salt;
    }

    // Structure for storing swap-related data
    struct HTLC {
    // Not sure about the Length of the strings -- recommend it to store it as address & uints
    string dstAddress; 
    string dstChain; 
    string dstAsset; 
    string srcAsset; 

    // slotX = sender(20bytes) + timelock(6bytes) + redeemed(1byte) + refunded(1byte) 
    address payable sender; 
    uint48 timelock; 
    bool redeemed;
    bool refunded;

    // slotX+1 = srcReceiver
    address payable srcReceiver;

    // slotX+2 = hashlock
    bytes32 hashlock; 

    // slotX+3 = amount
    uint256 amount; 

    // slotX+4 = secret
    uint256 secret;
    }

    struct addLockMsg {
    bytes32 Id; // 32 bytes
    bytes32 hashlock; // 32 bytes 
    uint48 timelock; 
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
    event TokenRedeemed(bytes32 indexed Id, address redeemAddress,uint256 secret, bytes32 hashlock);

    // Custom Errors
    error HTLCDoesnotExist();
    error HTLCExists();
    error FundsNotSent();
    error SetFutureTimeLock();
    error AlreadyRefunded();
    error AlreadyRedeemed();
    error TimeLockExists();
    error TransferFailed();
    error HashLockAlreadySet();
    error NotAuthorized();
    error InvalidSignature();

    constructor() payable{
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

    modifier _exists(bytes32 Id){
        if(hasHTLC(Id)){
            _;
        }
        else
            revert HTLCDoesnotExist();
    }

    bytes32 private DOMAIN_SEPARATOR;
    bytes32 private constant SALT = keccak256(abi.encodePacked('Layerswap V8'));
    uint256 blockHashAsUint = uint256(blockhash(block.number - 1));
    uint256 contractNonce = 1;  
    mapping(bytes32 => HTLC) contracts;
    // Give senderAddress and ProvideThem back with Ids
    mapping(address => bytes32[])contractIds;

    function commit(
        string[] calldata hopChains,
        string[] calldata hopAssets,
        string[] calldata hopAddresses,
        string calldata dstChain,
        string calldata dstAsset,
        string calldata dstAddress,
        string calldata srcAsset,
        address srcReceiver,
        uint48 timelock
    ) external payable returns (bytes32 Id) {
        if(msg.value == 0) revert FundsNotSent();
        if(timelock <= block.timestamp) revert SetFutureTimeLock();
        contractNonce += 1; // @> when called first-time it consumes 21200 gas as zero to non-zero costs gas
        Id = bytes32(blockHashAsUint ^ contractNonce);

        contractIds[msg.sender].push(Id);

        contracts[Id] = HTLC(
        dstAddress,
        dstChain,
        dstAsset,
        srcAsset,
        payable(msg.sender),
        timelock,
        false,
        false,
        payable(srcReceiver),
        bytes32(bytes1(0x01)), // @note - Initilizating it to 1 to save gas for the next execution or state-change
        msg.value,
        uint256(1) // @note - Initilizating it to 1 
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
        timelock
        );
    }

    function refund(bytes32 Id) external _exists(Id) returns (bool) {
        HTLC storage htlc = contracts[Id];

        if(htlc.refunded) revert AlreadyRefunded();
        if(htlc.redeemed) revert AlreadyRedeemed();
        if(htlc.timelock >= block.timestamp) revert TimeLockExists();

        htlc.refunded = true;
        // @note to-do: Use Nomad-xyz's execcsiveSafeCall to safeGuard from return bomb attack
        (bool success, ) = htlc.sender.call{ value: htlc.amount }('');
        emit TokenRefunded(Id);
        if(success){
            return success;
        }
        else
            revert TransferFailed();
    }


    function addLock(bytes32 Id, bytes32 hashlock, uint48 timelock) external _exists(Id) returns (bytes32) {
        HTLC storage htlc = contracts[Id];

        if(htlc.refunded) revert AlreadyRefunded();
        if(timelock < block.timestamp) revert SetFutureTimeLock();

        if (msg.sender == htlc.sender || msg.sender == address(this)) 
        {
            if (htlc.hashlock == bytes32(bytes1(0x01))){
                htlc.hashlock = hashlock;
                htlc.timelock = timelock;
            } 
            else{
                revert HashLockAlreadySet();
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
        } 
        else{
            revert NotAuthorized();
        }
    }

    function addLockSig(addLockMsg memory message, uint8 v, bytes32 r, bytes32 s) external returns (bytes32) {
        if (verifyMessage(message, v, r, s)) {
            return this.addLock(message.Id, message.hashlock, message.timelock);
        } else {
            revert InvalidSignature();
        }
    }


    function lock(
        bytes32 Id,
        bytes32 hashlock,
        uint48 timelock,
        address payable srcReceiver,
        string calldata srcAsset,
        string calldata dstChain,
        string calldata dstAddress,
        string calldata dstAsset
    ) external payable returns (bytes32) {

        if(msg.value == 0) revert FundsNotSent();
        if(timelock <= block.timestamp) revert SetFutureTimeLock();
        if(hasHTLC(Id)) revert HTLCExists();

        contracts[Id] = HTLC(
        dstAddress,
        dstChain,
        dstAsset,
        srcAsset,
        payable(msg.sender),
        timelock,
        false,
        false,
        srcReceiver,
        hashlock,
        msg.value,
        uint256(1)
        );

        contractIds[msg.sender].push(Id);

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

    function redeem(bytes32 Id, uint256 secret) external _exists(Id) returns (bool) {
        HTLC storage htlc = contracts[Id];

        require(htlc.hashlock == sha256(abi.encodePacked(secret)),"Hashlock Not Match");
        if(htlc.refunded) revert AlreadyRefunded();
        if(htlc.redeemed) revert AlreadyRedeemed();

        htlc.secret = secret;
        htlc.redeemed = true;
        (bool success, ) = htlc.srcReceiver.call{ value: htlc.amount }('');
        if(success){
            emit TokenRedeemed(Id, msg.sender,secret,htlc.hashlock);
            return success;
        }
        else
            revert TransferFailed();
    }

    function getDetails(bytes32 Id) public view returns (HTLC memory) {
        return contracts[Id];
    }

    function getContracts(address senderAddr) public view returns (bytes32[] memory) {
        return contractIds[senderAddr];
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