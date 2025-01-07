//      _   _                  _        ____             _
//     / \ | |_ ___  _ __ ___ (_) ___  |  _ \ ___   ___ | |
//    / _ \| __/ _ \| '_ ` _ \| |/ __| | |_) / _ \ / _ \| |
//   / ___ \ || (_) | | | | | | | (__  |  __/ (_) | (_) | |
//  /_/   \_\__\___/|_| |_| |_|_|\___| |_|   \___/ \___/|_|

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;
import '@openzeppelin/contracts/utils/ReentrancyGuard.sol';

/// @notice Interface of Layerswap V8 protocol
interface ILayerswapV8 {
  /// @notice Represents an HTLC in the Layerswap V8 protocol
  struct HTLC {
    uint256 amount; // Locked funds
    bytes32 hashlock; // Hash of secret
    uint256 secret; // Secret for redemption
    address payable sender; // Creator of the HTLC
    address payable srcReceiver; // Recipient if conditions met
    uint48 timelock; // Refund timestamp
    uint8 claimed; // Claimed status (redeemed/refunded)
  }

  /// @notice Get details of an HTLC by ID
  /// @param htlcID Identifier of the HTLC
  /// @return HTLC structure details
  function getDetails(bytes32 htlcID) external view returns (HTLC memory);
}

contract AtomicPool is ReentrancyGuard {
  error PoolNotExists(); // Error: Pool does not exist
  error NotFutureTimelock(); // Error: Invalid timelock
  error FundsNotSent(); // Error: No funds sent
  error NotPassedTimelock(); // Error: Timelock not passed
  error InvalidOperation(); // Error: Invalid operation
  error NoAllowance(); // Error: Unauthorized access
  error NoFunds(); // Error: No funds in pool or already punished
  error InvalidSolver(); // Error: Invalid solver
  error TransferFailed(); // Error: Fund transfer failed
  error HashlockNotMatch(); // Error: Hashlock mismatch

  /// @notice Pool locked event
  /// @param ID Pool ID
  /// @param payer Pool creator
  /// @param solver Solver address
  /// @param amount Locked amount
  /// @param timelock Expiry time
  event PoolLocked(uint256 indexed ID, address payer, address solver, uint256 amount, uint48 timelock);

  /// @notice Pool unlocked event
  /// @param ID Pool ID
  /// @param payer Pool creator
  /// @param solver Solver address
  /// @param amount Unlocked amount
  event PoolUnlocked(uint256 indexed ID, address payer, address solver, uint256 amount);

  /// @notice Pool timelock extended event
  /// @param ID Pool ID
  /// @param timelock New timelock
  event PoolTimeExtended(uint256 indexed ID, address solver, uint48 timelock);

  /// @notice Solver punished event
  /// @param ID Pool ID
  /// @param amount Penalized amount
  /// @param solver Solver address
  /// @param punisher Punisher address
  event SolverPunished(uint256 indexed ID, address solver, uint256 amount, address punisher);

  struct Pool {
    uint256 amount; // Locked amount
    address payable solver; // Solver address
    uint48 timelock; // Timelock expiry
  }

  uint256 private nonce = 0; // Pool identifier counter
  mapping(uint256 => Pool) pools; // Pool storage
  mapping(uint256 => address payable) payers; // Payer storage
  ILayerswapV8 LayerswapV8; // Layerswap protocol instance

  /// @notice Contract constructor
  /// @param _LayerswapV8Contract Layerswap V8 contract address
  constructor(address _LayerswapV8Contract) {
    LayerswapV8 = ILayerswapV8(_LayerswapV8Contract);
  }

  /// @notice Ensures pool exists
  modifier _exists(uint256 ID) {
    if (pools[ID].solver == address(0)) revert PoolNotExists();
    _;
  }

  /// @notice Lock a pool with funds
  /// @param solver Address of solver
  /// @param timelock Expiry time for the pool
  /// @return Pool ID
  function lockPool(address solver, uint48 timelock) public payable nonReentrant returns (uint256) {
    if (msg.value == 0) revert FundsNotSent();
    if (timelock < block.timestamp + 86400) revert NotFutureTimelock(); // funds are locked at least for a day
    unchecked {
      ++nonce;
    }
    pools[nonce] = Pool(msg.value, payable(solver), timelock);
    payers[nonce] = payable(msg.sender);
    emit PoolLocked(nonce, msg.sender, solver, msg.value, timelock);
    return nonce;
  }

  /// @notice Unlock a pool and transfer funds to payer
  /// @param ID Pool ID
  /// @return Pool ID
  function unlockPool(uint256 ID) public _exists(ID) nonReentrant returns (uint256) {
    Pool storage pool = pools[ID];
    // This check can be removed because attempting to unlockPool a second time will result in the attacker receiving an amount of 0.
    if (pool.amount == 0) revert NoFunds();
    if (pool.timelock > block.timestamp) revert NotPassedTimelock();
    if (payers[ID] != msg.sender) revert NoAllowance();
    pool.amount = 0;
    (bool success, ) = payers[ID].call{ value: pool.amount }('');
    if (!success) revert TransferFailed();
    emit PoolUnlocked(ID, msg.sender, pool.solver, pool.amount);
    return ID;
  }

  /// @notice Extend the timelock of a pool
  /// @param ID Pool ID
  /// @param timelock New timelock
  /// @return Pool ID
  function extendPoolTime(uint256 ID, uint48 timelock) public _exists(ID) nonReentrant returns (uint256) {
    Pool storage pool = pools[ID];
    if (pool.timelock > timelock) revert InvalidOperation();
    if (payers[ID] != msg.sender) revert NoAllowance();
    pool.timelock = timelock;
    emit PoolTimeExtended(ID, pool.solver, timelock);
    return ID;
  }

  /// @notice Punish solver by transferring funds to recipient
  /// @param ID Pool ID
  /// @param htlcID HTLC ID
  /// @param secret Secret to unlock hashlock
  /// @return Pool ID
  function punishSolver(uint256 ID, bytes32 htlcID, uint256 secret) public _exists(ID) nonReentrant returns (uint256) {
    ILayerswapV8.HTLC memory htlc = LayerswapV8.getDetails(htlcID);
    Pool storage pool = pools[ID];
    if (pool.amount == 0) revert NoFunds();
    if (htlc.sender != pool.solver) revert InvalidSolver();
    if (htlc.hashlock != sha256(abi.encodePacked(secret))) revert HashlockNotMatch();

    // TODO: Implement a check to ensure at least half of the timelock duration has passed to mitigate potential MEV attacks.

    pool.amount = 0;
    (bool success, ) = htlc.srcReceiver.call{ value: pool.amount }('');
    if (!success) revert TransferFailed();
    emit SolverPunished(ID, pool.solver, pool.amount, msg.sender);
    return ID;
  }

  /// @notice Get details of a pool
  /// @param ID Pool ID
  /// @return Pool details
  function getPool(uint256 ID) public view returns (Pool memory) {
    return pools[ID];
  }
}
