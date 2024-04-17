// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

/**
 * @title Hashed Timelock Contracts (HTLCs) for Ethereum.
 *
 * This contract provides a way to create and keep HTLCs for Ether (ETH).
 *
 * Protocol:
 *
 *  1) createHTLC(receiver, hashlock, timelock) - a sender calls this to create
 *      a new HTLC and gets back a 32 byte contract id
 *  2) redeem(contractId, secret) - once the receiver knows the secret of
 *      the hashlock hash they can claim the Ether with this function
 *  3) refund() - after the timelock has expired and if the receiver did not
 *      redeem funds, the sender/creator of the HTLC can get their Ether
 *      back with this function.
 */
contract HashedTimelockEther {
  error FundsNotSent();
  error NotFutureTimelock();
  error NotPassedTimelock();
  error ContractAlreadyExist();
  error ContractNotExist();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyRefunded();
  error IncorrectData();

  struct HTLC {
    bytes32 hashlock;
    bytes32 secret;
    uint256 amount;
    uint256 timelock;
    address payable sender;
    address payable receiver;
    bool redeemed;
    bool refunded;
  }

  mapping(bytes32 => HTLC) contracts;

  event EtherTransferInitiated(
    bytes32 indexed contractId,
    bytes32 hashlock,
    uint256 amount,
    uint256 chainID,
    uint256 timelock,
    address indexed sender,
    address indexed receiver,
    string targetCurrencyReceiverAddress
  );
  event EtherTransferClaimed(bytes32 indexed contractId);
  event EtherTransferRefunded(bytes32 indexed contractId);
  event BatchEtherTransfersCompleted(bytes32[] indexed contractId);

  modifier contractExists(bytes32 _contractId) {
    if (!hasContract(_contractId)) revert ContractNotExist();
    _;
  }

  /**
   * @dev Sender sets up a new hash time lock contract depositing the Ether and
   * providing the receiver lock terms.
   *
   * @param _receiver Receiver of the Ether.
   * @param _hashlock A sha-256 hash hashlock.
   * @param _timelock UNIX epoch seconds time that the lock expires at.
   *                  Refunds can be made after this time.
   * @return contractId Id of the new HTLC. This is needed for subsequent
   *                    calls.
   */
  function createHTLC(
    address payable _receiver,
    bytes32 _hashlock,
    uint256 _timelock,
    uint256 _chainID,
    string memory _targetCurrencyReceiverAddress
  ) external payable returns (bytes32 contractId) {
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (_timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }
    contractId = sha256(abi.encodePacked(msg.sender, _receiver, msg.value, _hashlock, _timelock));

    if (hasContract(contractId)) {
      revert ContractAlreadyExist();
    }
    contracts[contractId] = HTLC(_hashlock, 0x0, msg.value, _timelock, payable(msg.sender), _receiver, false, false);

    emit EtherTransferInitiated(
      contractId,
      _hashlock,
      msg.value,
      _chainID,
      _timelock,
      msg.sender,
      _receiver,
      _targetCurrencyReceiverAddress
    );
  }

  function createBatchHTLC(
    address payable[] memory _receivers,
    bytes32[] memory _hashlocks,
    uint256[] memory _timelocks,
    uint256[] memory _chainIDs,
    string[] memory _targetCurrencyReceiversAddresses,
    uint[] memory _amounts
  ) external payable returns (bytes32[] memory contractIds) {
    
    contractIds = new bytes32[](_receivers.length);
    if (msg.value == 0) {
      revert FundsNotSent();
    }

    uint result = 0;

    for (uint i = 0; i < _amounts.length; i++) {
      if (_amounts[i] == 0) {
        revert FundsNotSent();
      }
      result += _amounts[i];
    }

    if (
      _receivers.length == 0 ||
      _receivers.length != _hashlocks.length ||
      _receivers.length != _timelocks.length ||
      _receivers.length != _chainIDs.length ||
      _receivers.length != _targetCurrencyReceiversAddresses.length ||
      result != msg.value
    ) {
      revert IncorrectData();
    }

    for (uint i = 0; i < _receivers.length; i++) {
      if (_timelocks[i] <= block.timestamp) {
        revert NotFutureTimelock();
      }
      contractIds[i] = (sha256(
        abi.encodePacked(msg.sender, _receivers[i], _amounts[i], _hashlocks[i], _timelocks[i])
      ));

      if (hasContract(contractIds[i])) {
        revert ContractAlreadyExist();
      }

      contracts[contractIds[i]] = HTLC(
        _hashlocks[i],
        0x0,
        _amounts[i],
        _timelocks[i],
        payable(msg.sender),
        _receivers[i],
        false,
        false
      );

      emit EtherTransferInitiated(
        contractIds[i],
        _hashlocks[i],
        _amounts[i],
        _chainIDs[i],
        _timelocks[i],
        msg.sender,
        _receivers[i],
        _targetCurrencyReceiversAddresses[i]
      );
    }
  }

  /**
   * @dev Called by the receiver once they know the secret of the hashlock.
   * This will transfer the locked funds to their address.
   *
   * @param _contractId Id of the HTLC.
   * @param _secret sha256(_secret) should equal the contract hashlock.
   * @return bool true on success
   */
  function redeem(bytes32 _contractId, bytes32 _secret) external contractExists(_contractId) returns (bool) {
    HTLC storage htlc = contracts[_contractId];

    bytes32 pre = sha256(abi.encodePacked(_secret));
    if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock <= block.timestamp) revert NotFutureTimelock();

    htlc.secret = _secret;
    htlc.redeemed = true;
    htlc.receiver.transfer(htlc.amount);
    emit EtherTransferClaimed(_contractId);
    return true;
  }

  /**
   * @notice Allows multiple HTLCs to be redeemed in a batch.
   * @dev This function is used to redeem funds from multiple HTLCs simultaneously, providing the corresponding secrets for each HTLC.
   * @param _contractIds An array of HTLC contract IDs to be redeemed.
   * @param _secrets An array of secrets corresponding to the HTLCs.
   * @return A boolean indicating whether the batch redemption was successful.
   * @dev Emits an `BatchEtherTransfersCompleted` event upon successful redemption of all specified HTLCs.
   */
  function batchRedeem(bytes32[] memory _contractIds, bytes32[] memory _secrets) external returns (bool) {
    if (_contractIds.length != _secrets.length) {
      revert IncorrectData();
    }
    for (uint256 i; i < _contractIds.length; i++) {
      if (!hasContract(_contractIds[i])) revert ContractNotExist();
    }
    uint256 totalToRedeem;
    address payable _receiver = contracts[_contractIds[0]].receiver;
    for (uint256 i; i < _contractIds.length; i++) {
      HTLC storage htlc = contracts[_contractIds[i]];
      bytes32 pre = sha256(abi.encodePacked(_secrets[i]));
      if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
      if (htlc.refunded) revert AlreadyRefunded();
      if (htlc.redeemed) revert AlreadyRedeemed();
      if (htlc.timelock <= block.timestamp) revert NotFutureTimelock();

      htlc.secret = _secrets[i];
      htlc.redeemed = true;
      if (_receiver == htlc.receiver) {
        totalToRedeem += htlc.amount;
      } else {
        htlc.receiver.transfer(htlc.amount);
      }
    }
    _receiver.transfer(totalToRedeem);
    emit BatchEtherTransfersCompleted(_contractIds);
    return true;
  }

  /**
   * @dev Called by the sender if there was no redeem AND the time lock has
   * expired. This will refund the contract amount.
   *
   * @param _contractId Id of HTLC to refund from.
   * @return bool true on success
   */
  function refund(bytes32 _contractId) external contractExists(_contractId) returns (bool) {
    HTLC storage htlc = contracts[_contractId];

    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.refunded = true;
    htlc.sender.transfer(htlc.amount);
    emit EtherTransferRefunded(_contractId);
    return true;
  }

  /**
   * @dev Get contract details.
   * @param _contractId HTLC contract id
   */
  function getHTLCDetails(
    bytes32 _contractId
  )
    public
    view
    returns (
      address sender,
      address receiver,
      uint256 amount,
      bytes32 hashlock,
      uint256 timelock,
      bool redeemed,
      bool refunded,
      bytes32 secret
    )
  {
    if (!hasContract(_contractId)) {
      return (address(0), address(0), 0, 0, 0, false, false, 0);
    }
    HTLC storage htlc = contracts[_contractId];
    return (
      htlc.sender,
      htlc.receiver,
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
   * @param _contractId Id into contracts mapping.
   */
  function hasContract(bytes32 _contractId) internal view returns (bool exists) {
    exists = (contracts[_contractId].sender != address(0));
  }
}
