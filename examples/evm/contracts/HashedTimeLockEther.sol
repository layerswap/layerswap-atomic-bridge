// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Hashed Timelock Contracts (HTLCs) for Ethereum.
 *
 * This contract provides a way to create and keep HTLCs for Ether (ETH).
 *
 * Protocol:
 *
 *  1) createHTLC(receiver, hashlock, timelock) - a sender calls this to create
 *      a new HTLC and gets back a 32 byte contract id
 *  2) withdraw(contractId, preimage) - once the receiver knows the preimage of
 *      the hashlock hash they can claim the Ether with this function
 *  3) refund() - after the timelock has expired and if the receiver did not
 *      withdraw funds, the sender/creator of the HTLC can get their Ether
 *      back with this function.
 */
contract HashedTimelockEther {
  event HTLCNew(
    bytes32 indexed contractId,
    address indexed sender,
    address indexed receiver,
    uint256 amount,
    bytes32 hashlock,
    uint256 timelock
  );
  event HTLCWithdraw(bytes32 indexed contractId);
  event HTLCRefund(bytes32 indexed contractId);

  struct LockContract {
    address payable sender;
    address payable receiver;
    uint256 amount;
    bytes32 hashlock; // sha-256 hash
    uint256 timelock; // UNIX timestamp seconds - locked UNTIL this time
    bool withdrawn;
    bool refunded;
    bytes32 preimage;
  }

  modifier hasSentFunds() {
    require(msg.value > 0, 'msg.value must be > 0');
    _;
  }

  modifier isFutureTimelock(uint256 _time) {
    require(_time > block.timestamp, 'timelock time must be in the future');
    _;
  }

  modifier contractExists(bytes32 _contractId) {
    require(hasContract(_contractId), 'contractId does not exist');
    _;
  }

  modifier hashlockMatches(bytes32 _contractId, bytes32 _x) {
    bytes32 pre = sha256(abi.encodePacked(_x));
    require(contracts[_contractId].hashlock == sha256(abi.encodePacked(pre)), 'hashlock hash does not match');
    _;
  }

  modifier isWithdrawable(bytes32 _contractId) {
    require(contracts[_contractId].receiver == msg.sender, 'withdrawable: not receiver');
    require(!contracts[_contractId].withdrawn, 'withdrawable: already withdrawn');
    require(contracts[_contractId].timelock > block.timestamp, 'withdrawable: timelock time must be in the future');
    _;
  }

  modifier isRefundable(bytes32 _contractId) {
    require(contracts[_contractId].sender == msg.sender, 'refundable: not sender');
    require(!contracts[_contractId].refunded, 'refundable: already refunded');
    require(!contracts[_contractId].withdrawn, 'refundable: already withdrawn');
    require(contracts[_contractId].timelock <= block.timestamp, 'refundable: timelock not yet passed');
    _;
  }

  mapping(bytes32 => LockContract) contracts;

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
    uint256 _timelock
  ) external payable hasSentFunds isFutureTimelock(_timelock) returns (bytes32 contractId) {
    contractId = sha256(abi.encodePacked(msg.sender, _receiver, msg.value, _hashlock, _timelock));

    // Reject if a contract already exists with the same parameters. The
    // sender must change one of these parameters to create a new distinct
    // contract.
    if (hasContract(contractId)) revert('Contract already exists');

    contracts[contractId] = LockContract(
      payable(msg.sender),
      _receiver,
      msg.value,
      _hashlock,
      _timelock,
      false,
      false,
      0x0
    );

    emit HTLCNew(contractId, msg.sender, _receiver, msg.value, _hashlock, _timelock);
  }

  /**
   * @dev Called by the receiver once they know the preimage of the hashlock.
   * This will transfer the locked funds to their address.
   *
   * @param _contractId Id of the HTLC.
   * @param _preimage sha256(_preimage) should equal the contract hashlock.
   * @return bool true on success
   */
  function withdraw(bytes32 _contractId, bytes32 _preimage)
    external
    contractExists(_contractId)
    hashlockMatches(_contractId, _preimage)
    isWithdrawable(_contractId)
    returns (bool)
  {
    LockContract storage c = contracts[_contractId];
    c.preimage = _preimage;
    c.withdrawn = true;
    c.receiver.transfer(c.amount);
    emit HTLCWithdraw(_contractId);
    return true;
  }

  /**
   * @dev Called by the sender if there was no withdraw AND the time lock has
   * expired. This will refund the contract amount.
   *
   * @param _contractId Id of HTLC to refund from.
   * @return bool true on success
   */
  function refund(bytes32 _contractId) external contractExists(_contractId) isRefundable(_contractId) returns (bool) {
    LockContract storage c = contracts[_contractId];
    c.refunded = true;
    c.sender.transfer(c.amount);
    emit HTLCRefund(_contractId);
    return true;
  }

  /**
   * @dev Get contract details.
   * @param _contractId HTLC contract id
   */
  function getContract(bytes32 _contractId)
    public
    view
    returns (
      address sender,
      address receiver,
      uint256 amount,
      bytes32 hashlock,
      uint256 timelock,
      bool withdrawn,
      bool refunded,
      bytes32 preimage
    )
  {
    if (!hasContract(_contractId)) return (address(0), address(0), 0, 0, 0, false, false, 0);
    LockContract storage c = contracts[_contractId];
    return (c.sender, c.receiver, c.amount, c.hashlock, c.timelock, c.withdrawn, c.refunded, c.preimage);
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param _contractId Id into contracts mapping.
   */
  function hasContract(bytes32 _contractId) internal view returns (bool exists) {
    exists = (contracts[_contractId].sender != address(0));
  }
}
