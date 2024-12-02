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
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title LayerswapV8 Contract
/// @notice Implements the Layerswap V8 PreHTLC protocol, enabling secure and atomic cross-chain swaps.
/// @dev Manages HTLCs for trustless cross-chain transactions with event-based updates.

/// @dev Represents the EIP-712 domain for signature verification.
struct EIP712Domain {
    string name;
    string version;
    uint256 chainId;
    address verifyingContract;
    bytes32 salt;
}

contract LayerswapV8 {
    using ECDSA for bytes32;

    bytes32 private immutable DOMAIN_SEPARATOR;

    /// @dev Sets up the EIP-712 domain details used for verifying signed messages.
    constructor() {
        DOMAIN_SEPARATOR = hashDomain(
            EIP712Domain({
                name: "LayerswapV8",
                version: "1",
                chainId: block.chainid,
                verifyingContract: address(this),
                salt: 0x2e4ff7169d640efc0d28f2e302a56f1cf54aff7e127eededda94b3df0946f5c0
            })
        );
    }

    /// @dev Custom errors to simplify failure handling in the contract.
    error FundsNotSent();
    error NotFutureTimelock();
    error NotPassedTimelock();
    error HTLCAlreadyExists();
    error HTLCNotExists();
    error HashlockNotMatch();
    error AlreadyClaimed();
    error NoAllowance();
    error InvalidSigniture();
    error HashlockAlreadySet();
    error TransferFailed();

    /// @dev Represents a hashed time-locked contract (HTLC) used in the Layerswap V8 protocol.
    struct HTLC {
        /// @notice The amount of funds locked in the HTLC.
        uint256 amount;
        /// @notice The hash of the secret required for redeem.
        bytes32 hashlock;
        /// @notice The secret required to redeem.
        uint256 secret;
        /// @notice The creator of the HTLC.
        address payable sender;
        /// @notice The recipient of the funds if conditions are met.
        address payable srcReceiver;
        /// @notice The timestamp after which the funds can be refunded.
        uint48 timelock;
        /// @notice Indicates whether the funds were claimed (redeemed(3) or refunded (2)).
        uint8 claimed;
    }

    /// @dev Represents the details required to add a lock, used as part of the `addLockSig` parameters.
    struct addLockMsg {
        /// @notice The identifier of the HTLC to which the hashlock should be added and the timelock updated.
        bytes32 Id;
        /// @notice The hashlock to be added to the HTLC.
        bytes32 hashlock;
        /// @notice The new timelock to be set for the HTLC.
        uint48 timelock;
    }

    /// @dev Emitted when an HTLC is created and funds are committed.
    /// @param Id The unique identifier of the HTLC.
    /// @param hopChains The sequence of chains forming the path from the source to the destination chain.
    /// @param hopAssets The sequence of assets being swapped along the path.
    /// @param hopAddresses The sequence of addresses involved along the path.
    /// @param dstChain The destination blockchain.
    /// @param dstAddress The recipient address on the destination chain.
    /// @param dstAsset The asset on the destination chain.
    /// @param sender The creator of the HTLC.
    /// @param srcReceiver The recipient of the funds if conditions are met.
    /// @param srcAsset The asset being locked.
    /// @param amount The amount of funds locked in the HTLC.
    /// @param timelock The timestamp after which the funds can be refunded.
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
        uint48 timelock
    );

    /// @dev Emitted when an HTLC is locked with a hashlock and timelock.
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
        uint48 timelock
    );

    /// @dev Emitted when a hashlock and timelock are added to an existing HTLC.
    event TokenLockAdded(bytes32 indexed Id, bytes32 hashlock, uint48 timelock);

    /// @dev Emitted when funds are refunded from an HTLC after the timelock expires.
    event TokenRefunded(bytes32 indexed Id);

    /// @dev Emitted when funds are redeemed from an HTLC using the correct secret.
    event TokenRedeemed(
        bytes32 indexed Id,
        address redeemAddress,
        uint256 secret,
        bytes32 hashlock
    );

    /// @dev Modifier to ensure HTLC exists before proceeding.
    modifier _exists(bytes32 Id) {
        if (!hasHTLC(Id)) revert HTLCNotExists();
        _;
    }

    /// @dev Unique identifier generation using block hash and a nonce.
    uint256 private immutable blockHashAsUint =
        uint256(blockhash(block.number - 20));
    uint256 private contractNonce = 0;

    /// @dev Storage for HTLCs
    mapping(bytes32 => HTLC) private contracts;

    /// @notice Creates and commits a new hashed time-locked contract (HTLC).
    /// @dev Locks funds in the contract and emits a `TokenCommitted` event.
    /// @param hopChains The sequence of chains forming the path from the source to the destination chain.
    /// @param hopAssets The sequence of assets being swapped along the path.
    /// @param hopAddresses The sequence of addresses involved along the path.
    /// @param dstChain The destination blockchain.
    /// @param dstAsset The asset on the destination chain.
    /// @param dstAddress The recipient address on the destination chain.
    /// @param srcAsset The asset being locked.
    /// @param srcReceiver The recipient of the funds if conditions are met.
    /// @param timelock The timestamp after which the funds can be refunded.
    /// @return Id The unique identifier of the created HTLC.
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
        if (msg.value == 0) revert FundsNotSent(); // Ensure funds are sent.
        if (timelock < block.timestamp) revert NotFutureTimelock(); // Ensure timelock is in the future.
        unchecked {
            ++contractNonce; // Increment nonce for uniqueness.
        }
        Id = bytes32(blockHashAsUint ^ contractNonce);

        // Store HTLC details.
        contracts[Id] = HTLC(
            msg.value,
            bytes32(bytes1(0x01)),
            uint256(1),
            payable(msg.sender),
            payable(srcReceiver),
            timelock,
            uint8(1)
        );

        // Emit the commit event.
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

    /// @notice Refunds the locked funds from an HTLC after the timelock expires.
    /// @dev Can only be called if the HTLC exists and the timelock has passed. Emits a `TokenRefunded` event.
    /// @param Id The unique identifier of the HTLC to be refunded.
    /// @return bool Returns `true` if the refund is successful.
    function refund(bytes32 Id) external _exists(Id) returns (bool) {
        HTLC storage htlc = contracts[Id];
        if (htlc.claimed == 2 || htlc.claimed == 3) revert AlreadyClaimed(); // Prevent refund if already redeemed or refunded.
        if (htlc.timelock > block.timestamp) revert NotPassedTimelock(); // Ensure timelock has passed.

        htlc.claimed = 2;
        (bool success, ) = htlc.sender.call{value: htlc.amount}("");
        if (!success) revert TransferFailed(); // Ensure transfer succeeds.
        emit TokenRefunded(Id);
        return true;
    }

    /// @notice Adds a hashlock and updates the timelock for an existing HTLC.
    /// @dev Can only be called by the HTLC's creator if the HTLC exists and has not been claimed. Emits a `TokenLockAdded` event.
    /// @param Id The unique identifier of the HTLC to update.
    /// @param hashlock The hashlock to be added.
    /// @param timelock The new timelock to be set.
    /// @return bytes32 The updated HTLC identifier.
    function addLock(
        bytes32 Id,
        bytes32 hashlock,
        uint48 timelock
    ) external _exists(Id) returns (bytes32) {
        HTLC storage htlc = contracts[Id];
        if (htlc.claimed == 2 || htlc.claimed == 3) revert AlreadyClaimed();
        if (timelock < block.timestamp) revert NotFutureTimelock();
        if (msg.sender == htlc.sender) {
            if (htlc.hashlock == bytes32(bytes1(0x01))) {
                htlc.hashlock = hashlock;
                htlc.timelock = timelock;
            } else {
                revert HashlockAlreadySet(); // Prevent overwriting hashlock.
            }
            emit TokenLockAdded(Id, hashlock, timelock);
            return Id;
        } else {
            revert NoAllowance(); // Ensure only allowed accounts can add a lock.
        }
    }

    /// @notice Adds a hashlock and updates the timelock for an existing HTLC using a signed message.
    /// @dev Verifies the provided signature and updates the HTLC if valid. Emits a `TokenLockAdded` event.
    /// @param message The details of the lock to be added, including the HTLC ID, hashlock, and timelock.
    /// @param r The `r` value of the ECDSA signature.
    /// @param s The `s` value of the ECDSA signature.
    /// @param v The `v` value of the ECDSA signature.
    /// @return bytes32 The updated HTLC identifier.
    function addLockSig(
        addLockMsg calldata message,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) external _exists(message.Id) returns (bytes32) {
        if (verifyMessage(message, r, s, v)) {
            HTLC storage htlc = contracts[message.Id];
            if (htlc.claimed == 2 || htlc.claimed == 3) revert AlreadyClaimed();
            if (message.timelock < block.timestamp) revert NotFutureTimelock();
            if (htlc.hashlock == bytes32(bytes1(0x01))) {
                htlc.hashlock = message.hashlock;
                htlc.timelock = message.timelock;
            } else {
                revert HashlockAlreadySet();
            }
            emit TokenLockAdded(message.Id, message.hashlock, message.timelock);
            return message.Id;
        } else {
            revert InvalidSigniture(); // Ensure valid signature.
        }
    }

    /// @notice Locks funds in a new hashed time-locked contract (HTLC).
    /// @dev Creates an HTLC with the specified details and emits a `TokenLocked` event.
    /// @param Id The unique identifier for the new HTLC.
    /// @param hashlock The hash of the secret required for redeeming the HTLC.
    /// @param timelock The timestamp after which the funds can be refunded if not claimed.
    /// @param srcReceiver The recipient of the funds if the HTLC is successfully redeemed.
    /// @param srcAsset The asset being locked in the HTLC.
    /// @param dstChain The destination blockchain for the swap.
    /// @param dstAddress The recipient address on the destination chain.
    /// @param dstAsset The asset on the destination chain.
    /// @return bytes32 The unique identifier of the created HTLC.
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
        if (msg.value == 0) revert FundsNotSent();
        if (timelock < block.timestamp) revert NotFutureTimelock();
        if (hasHTLC(Id)) revert HTLCAlreadyExists();
        contracts[Id] = HTLC(
            msg.value,
            hashlock,
            uint256(1),
            payable(msg.sender),
            srcReceiver,
            timelock,
            uint8(1)
        );
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

    /// @notice Redeems funds from an HTLC using the correct secret.
    /// @dev Verifies the provided secret against the hashlock and transfers the funds to the recipient. Emits a `TokenRedeemed` event.
    /// @param Id The unique identifier of the HTLC to be redeemed.
    /// @param secret The secret value used to unlock the HTLC.
    /// @return bool Returns `true` if the redemption is successful.
    function redeem(
        bytes32 Id,
        uint256 secret
    ) external _exists(Id) returns (bool) {
        HTLC storage htlc = contracts[Id];

        if (htlc.hashlock != sha256(abi.encodePacked(secret)))
            revert HashlockNotMatch(); // Ensure secret matches hashlock.
        if (htlc.claimed == 3 || htlc.claimed == 2) revert AlreadyClaimed();

        htlc.claimed = 3;
        htlc.secret = secret;
        (bool success, ) = htlc.srcReceiver.call{value: htlc.amount}("");
        if (!success) revert TransferFailed();
        emit TokenRedeemed(Id, msg.sender, secret, htlc.hashlock);
        return true;
    }

    /// @notice Retrieves the details of a specific HTLC.
    /// @dev Returns the HTLC structure associated with the given identifier.
    /// @param Id The unique identifier of the HTLC.
    /// @return HTLC The details of the specified HTLC.
    function getDetails(bytes32 Id) public view returns (HTLC memory) {
        return contracts[Id];
    }

    /// @notice Generates a hash of the EIP-712 domain.
    /// @dev Encodes and hashes the EIP-712 domain fields according to the specification.
    /// @param domain The EIP-712 domain structure containing the domain details.
    /// @return bytes32 The hashed representation of the EIP-712 domain.
    function hashDomain(
        EIP712Domain memory domain
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)"
                    ),
                    keccak256(bytes(domain.name)),
                    keccak256(bytes(domain.version)),
                    domain.chainId,
                    domain.verifyingContract,
                    domain.salt
                )
            );
    }

    /// @notice Generates a hash of the `addLockMsg` structure.
    /// @dev Encodes and hashes the `addLockMsg` fields for use in EIP-712 signature verification.
    /// @param message The `addLockMsg` structure containing the HTLC details to be hashed.
    /// @return bytes32 The hashed representation of the `addLockMsg` structure.
    function hashMessage(
        addLockMsg calldata message
    ) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "addLockMsg(bytes32 Id,bytes32 hashlock,uint48 timelock)"
                    ),
                    message.Id,
                    message.hashlock,
                    message.timelock
                )
            );
    }

    /// @notice Verifies that an EIP-712 message signature matches the sender of the specified HTLC.
    /// @dev Combines the domain separator and the hashed message to create the digest, then verifies the signature.
    /// @param message The `addLockMsg` structure containing the HTLC details.
    /// @param r The `r` value of the ECDSA signature.
    /// @param s The `s` value of the ECDSA signature.
    /// @param v The `v` value of the ECDSA signature.
    /// @return bool Returns `true` if the signature is valid and matches the sender of the HTLC.
    function verifyMessage(
        addLockMsg calldata message,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) private view returns (bool) {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashMessage(message))
        );
        return (ECDSA.recover(digest, v, r, s) == contracts[message.Id].sender);
    }

    /// @notice Checks whether an HTLC with the given Id exists.
    /// @dev An HTLC exists if the sender address in its details is non-zero.
    /// @param Id The unique identifier of the HTLC to check.
    /// @return bool Returns `true` if the HTLC exists, otherwise `false`.
    function hasHTLC(bytes32 Id) private view returns (bool) {
        return (contracts[Id].sender != address(0));
    }
}

