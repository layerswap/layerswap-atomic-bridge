// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';

/**
 * @title Hashed Timelock Contracts (HTLCs) on Ethereum ERC20 tokens.
 *
 * This contract provides a way to create and keep HTLCs for ERC20 tokens.
 *
 * Protocol:
 *
 *  1) create(receiver, hashlock, timelock, tokenContract, amount) - a
 *      sender calls this to create a new HTLC on a given token (tokenContract)
 *       for a given amount. A 32 byte contract id is returned
 *  2) redeem(contractId, secret) - once the receiver knows the secret of
 *      the hashlock hash they can claim the tokens with this function
 *  3) refund() - after timelock has expired and if the receiver did not
 *      redeem the tokens the sender / creator of the HTLC can get their tokens
 *      back with this function.
 */
contract HashedTimeLockERC20 {
  error NotFutureTimelock();
  error NotPassedTimelock();
  error HTLCAlreadyExist();
  error HTLCNotExist();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyRefunded();
  error FundsNotSent();
  error IncorrectData();
  error InsufficientBalance();
  error NoAllowance();

  struct HTLC {
    bytes32 hashlock;
    bytes32 secret;
    uint256 amount;
    uint256 timelock;
    address sender;
    address receiver;
    address tokenContract;
    bool redeemed;
    bool refunded;
  }

  using SafeERC20 for IERC20;
  mapping(bytes32 => HTLC) contracts;

  event TokenTransferInitiated(
    bytes32 indexed hashlock,
    uint256 amount,
    uint256 chainId,
    uint256 timelock,
    address indexed sender,
    address indexed receiver,
    address tokenContract,
    string targetCurrencyReceiverAddress
  );
  event TokenTransferClaimed(bytes32 indexed htlcId);
  event TokenTransferRefunded(bytes32 indexed htlcId);

  modifier htlcExists(bytes32 _htlcId) {
    if (!hasHTLC(_htlcId)) revert HTLCNotExist();
    _;
  }

  /**
   * @dev Sender / Payer sets up a new hash time lock contract depositing the
   * funds and providing the reciever and terms.
   * @param _receiver Receiver of the funds.
   * @param _hashlock A sha-256 hash hashlock.
   * @param _timelock UNIX epoch seconds time that the lock expires at.
   *                  Refunds can be made after this time.
   * @return htlcId Id of the new HTLC. This is needed for subsequent
   *                    calls.
   */

  function create(
    address _receiver,
    bytes32 _hashlock,
    uint256 _timelock,
    address _tokenContract,
    uint256 _amount,
    uint256 _chainID,
    string memory _targetCurrencyReceiverAddress
  ) external returns (bytes32 htlcId) {
    if (_timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    if (_amount == 0) {
      revert FundsNotSent();
    }
    htlcId = _hashlock;

    if (hasHTLC(htlcId)) {
      revert HTLCAlreadyExist();
    }
    IERC20 token = IERC20(_tokenContract);

    if (token.balanceOf(msg.sender) < _amount) {
      revert InsufficientBalance();
    }

    if (token.allowance(msg.sender, address(this)) < _amount) {
      revert NoAllowance();
    }

    IERC20(_tokenContract).safeTransferFrom(msg.sender, address(this), _amount);
    contracts[htlcId] = HTLC(_hashlock, 0x0, _amount, _timelock, msg.sender, _receiver, _tokenContract, false, false);

    emit TokenTransferInitiated(
      _hashlock,
      _amount,
      _chainID,
      _timelock,
      msg.sender,
      _receiver,
      _tokenContract,
      _targetCurrencyReceiverAddress
    );
  }

  function batchCreate(
    address[] memory _receivers,
    bytes32[] memory _hashlocks,
    uint256[] memory _timelocks,
    address[] memory _tokenContracts,
    uint256[] memory _amounts,
    uint256[] memory _chainIDs,
    string[] memory _targetCurrencyReceiversAddresses
  ) external payable returns (bytes32[] memory htlcIds) {
    if (
      _receivers.length == 0 ||
      _receivers.length != _hashlocks.length ||
      _receivers.length != _timelocks.length ||
      _receivers.length != _chainIDs.length ||
      _receivers.length != _targetCurrencyReceiversAddresses.length ||
      _receivers.length != _amounts.length ||
      _receivers.length != _tokenContracts.length
    ) {
      revert IncorrectData();
    }

    htlcIds = new bytes32[](_receivers.length);

    for (uint256 i = 0; i < _receivers.length; i++) {
      if (_timelocks[i] <= block.timestamp) {
        revert NotFutureTimelock();
      }
      if (_amounts[i] == 0) {
        revert FundsNotSent();
      }

      htlcIds[i] = _hashlocks[i];

      if (hasHTLC(htlcIds[i])) {
        revert HTLCAlreadyExist();
      }
    }

    for (uint256 i = 0; i < _receivers.length; i++) {
      IERC20 token = IERC20(_tokenContracts[i]);

      if (token.balanceOf(msg.sender) < _amounts[i]) {
        revert InsufficientBalance();
      }
      
      if (token.allowance(msg.sender, address(this)) < _amounts[i]) {
        revert NoAllowance();
      }

      IERC20(_tokenContracts[i]).safeTransferFrom(msg.sender, _receivers[i], _amounts[i]);
      contracts[htlcIds[i]] = HTLC(
        _hashlocks[i],
        0x0,
        _amounts[i],
        _timelocks[i],
        msg.sender,
        _receivers[i],
        _tokenContracts[i],
        false,
        false
      );

      emit TokenTransferInitiated(
        _hashlocks[i],
        _amounts[i],
        _chainIDs[i],
        _timelocks[i],
        msg.sender,
        _receivers[i],
        _tokenContracts[i],
        _targetCurrencyReceiversAddresses[i]
      );
    }
  }

  /**
   * @dev Called by the receiver once they know the secret of the hashlock.
   * This will transfer the locked funds to their address.
   *
   * @param _htlcId Id of the HTLC.
   * @param _secret sha256(_secret) should equal the contract hashlock.
   * @return bool true on success
   */
  function redeem(bytes32 _htlcId, bytes32 _secret) external htlcExists(_htlcId) returns (bool) {
    HTLC storage htlc = contracts[_htlcId];

    bytes32 pre = sha256(abi.encodePacked(_secret));
    if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.timelock <= block.timestamp) revert NotFutureTimelock();

    htlc.secret = _secret;
    htlc.redeemed = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.receiver, htlc.amount);
    emit TokenTransferClaimed(_htlcId);
    return true;
  }

  /**
   * @notice Allows the batch redemption of tokens locked in multiple Hashed Time-Lock Contracts (HTLCs).
   * @dev This function is used to redeem tokens from multiple HTLCs simultaneously, providing the corresponding secrets for each HTLC.
   * @param _htlcIds An array containing the unique identifiers (IDs) of the HTLCs from which tokens are to be redeemed.
   * @param _secrets An array containing the secret values corresponding to each HTLC in _htlcIds.
   * @return A boolean indicating whether the batch redemption was successful.
   * @dev Emits an BatchTokenTransfersCompleted event upon successful batch redemption.
   */
  function batchRedeem(bytes32[] memory _htlcIds, bytes32[] memory _secrets) external returns (bool) {
    if (_htlcIds.length != _secrets.length) {
      revert IncorrectData();
    }
    for (uint256 i; i < _htlcIds.length; i++) {
      if (!hasHTLC(_htlcIds[i])) revert HTLCNotExist();
    }
    for (uint256 i; i < _htlcIds.length; i++) {
      HTLC storage htlc = contracts[_htlcIds[i]];
      bytes32 pre = sha256(abi.encodePacked(_secrets[i]));
      if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
      if (htlc.redeemed) revert AlreadyRedeemed();
      if (htlc.refunded) revert AlreadyRefunded();
      if (htlc.timelock <= block.timestamp) revert NotFutureTimelock();

      htlc.secret = _secrets[i];
      htlc.redeemed = true;
      IERC20(htlc.tokenContract).safeTransfer(htlc.receiver, htlc.amount);
      emit TokenTransferClaimed(_htlcIds[i]);
    }
    return true;
  }

  /**
   * @dev Called by the sender if there was no redeem AND the time lock has
   * expired. This will refund the contract amount.
   * @param _htlcId Id of HTLC to refund from.
   * @return bool true on success
   */
  function refund(bytes32 _htlcId) external htlcExists(_htlcId) returns (bool) {
    HTLC storage htlc = contracts[_htlcId];

    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.refunded = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.sender, htlc.amount);
    emit TokenTransferRefunded(_htlcId);
    return true;
  }

  /**
   * @dev Get contract details.
   * @param _htlcId HTLC contract id
   */
  function getHTLCDetails(
    bytes32 _htlcId
  )
    external
    view
    returns (
      address sender,
      address receiver,
      address tokenContract,
      uint256 amount,
      bytes32 hashlock,
      uint256 timelock,
      bool redeemed,
      bool refunded,
      bytes32 secret
    )
  {
    if (hasHTLC(_htlcId) == false) {
      return (address(0), address(0), address(0), 0, 0, 0, false, false, 0);
    }
    HTLC storage htlc = contracts[_htlcId];
    return (
      htlc.sender,
      htlc.receiver,
      htlc.tokenContract,
      htlc.amount,
      htlc.hashlock,
      htlc.timelock,
      htlc.redeemed,
      htlc.refunded,
      htlc.secret
    );
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param _htlcId Id into contracts mapping.
   */
  function hasHTLC(bytes32 _htlcId) internal view returns (bool exists) {
    exists = (contracts[_htlcId].sender != address(0));
  }
}
