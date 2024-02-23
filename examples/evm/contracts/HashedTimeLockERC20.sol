// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/**
 * @title Hashed Timelock Contracts (HTLCs) on Ethereum ERC20 tokens.
 *
 * This contract provides a way to create and keep HTLCs for ERC20 tokens.
 *
 * See HashedTimelock.sol for a contract that provides the same functions
 * for the native ETH token.
 *
 * Protocol:
 *
 *  1) createHTLC(receiver, hashlock, timelock, tokenContract, amount) - a
 *      sender calls this to create a new HTLC on a given token (tokenContract)
 *       for a given amount. A 32 byte contract id is returned
 *  2) withdraw(contractId, preimage) - once the receiver knows the preimage of
 *      the hashlock hash they can claim the tokens with this function
 *  3) refund() - after timelock has expired and if the receiver did not
 *      withdraw the tokens the sender / creator of the HTLC can get their tokens
 *      back with this function.
 */
contract HashedTimelockERC20 {
  event HTLCNew(
    bytes32 indexed contractId,
    address indexed sender,
    address indexed receiver,
    address tokenContract,
    uint256 amount,
    bytes32 hashlock,
    uint256 timelock
  );
  event HTLCWithdraw(bytes32 indexed contractId);
  event HTLCRefund(bytes32 indexed contractId);

  struct LockContract {
    address sender;
    address receiver;
    address tokenContract;
    uint256 amount;
    bytes32 hashlock;
    uint256 timelock;
    bool withdrawn;
    bool refunded;
    bytes32 preimage;
  }

  modifier tokensTransferable(
    address _token,
    address _sender,
    uint256 _amount
  ) {
    require(_amount > 0, 'token amount must be > 0');
    require(ERC20(_token).allowance(_sender, address(this)) >= _amount, 'token allowance must be >= amount');
    _;
  }
  modifier futureTimelock(uint256 _time) {
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
  modifier withdrawable(bytes32 _contractId) {
    require(contracts[_contractId].receiver == msg.sender, 'withdrawable: not receiver');
    require(!contracts[_contractId].withdrawn, 'withdrawable: already withdrawn');
    require(!contracts[_contractId].refunded, 'withdrawable: already refunded');
    require(contracts[_contractId].timelock > block.timestamp, 'withdrawable: timelock time must be in the future');
    _;
  }
  modifier refundable(bytes32 _contractId) {
    require(contracts[_contractId].sender == msg.sender, 'refundable: not sender');
    require(!contracts[_contractId].refunded, 'refundable: already refunded');
    require(!contracts[_contractId].withdrawn, 'refundable: already withdrawn');
    require(contracts[_contractId].timelock <= block.timestamp, 'refundable: timelock not yet passed');
    _;
  }

  mapping(bytes32 => LockContract) contracts;

  /**
     * @dev Sender / Payer sets up a new hash time lock contract depositing the
     * funds and providing the reciever and terms.
     *
     * NOTE: _receiver must first call approve() on the token contract.
     *       See allowance check in tokensTransferable modifier.
     */
  function createHTLC(
    address _receiver,
    bytes32 _hashlock,
    uint256 _timelock,
    address _tokenContract,
    uint256 _amount
  )
    external
    tokensTransferable(_tokenContract, msg.sender, _amount)
    futureTimelock(_timelock)
    returns (bytes32 contractId)
  {
    contractId = sha256(abi.encodePacked(msg.sender, _receiver, _tokenContract, _amount, _hashlock, _timelock));

    if (hasContract(contractId)) revert('Contract already exists');

    if (!ERC20(_tokenContract).transferFrom(msg.sender, address(this), _amount))
      revert('transferFrom sender to this failed');

    contracts[contractId] = LockContract(
      msg.sender,
      _receiver,
      _tokenContract,
      _amount,
      _hashlock,
      _timelock,
      false,
      false,
      0x0
    );

    emit HTLCNew(contractId, msg.sender, _receiver, _tokenContract, _amount, _hashlock, _timelock);
  }

  /**
   * @dev Called by the receiver once they know the preimage of the hashlock.
   * This will transfer ownership of the locked tokens to their address.
   */
  function withdraw(bytes32 _contractId, bytes32 _preimage)
    external
    contractExists(_contractId)
    hashlockMatches(_contractId, _preimage)
    withdrawable(_contractId)
    returns (bool)
  {
    LockContract storage c = contracts[_contractId];
    c.preimage = _preimage;
    c.withdrawn = true;
    ERC20(c.tokenContract).transfer(c.receiver, c.amount);
    emit HTLCWithdraw(_contractId);
    return true;
  }

  /**
   * @dev Called by the sender if there was no withdraw AND the time lock has
   * expired. This will restore ownership of the tokens to the sender.
   */
  function refund(bytes32 _contractId) external contractExists(_contractId) refundable(_contractId) returns (bool) {
    LockContract storage c = contracts[_contractId];
    c.refunded = true;
    ERC20(c.tokenContract).transfer(c.sender, c.amount);
    emit HTLCRefund(_contractId);
    return true;
  }

  /**
   * @dev Get contract details.
   */
  function getHTLCDetails(bytes32 _contractId)
    external
    view
    returns (
      address sender,
      address receiver,
      address tokenContract,
      uint256 amount,
      bytes32 hashlock,
      uint256 timelock,
      bool withdrawn,
      bool refunded,
      bytes32 preimage
    )
  {
    if (hasContract(_contractId) == false) return (address(0), address(0), address(0), 0, 0, 0, false, false, 0);
    LockContract storage c = contracts[_contractId];
    return (
      c.sender,
      c.receiver,
      c.tokenContract,
      c.amount,
      c.hashlock,
      c.timelock,
      c.withdrawn,
      c.refunded,
      c.preimage
    );
  }

  /**
   * @dev Is there a contract with id _contractId.
   */
  function hasContract(bytes32 _contractId) internal view returns (bool exists) {
    exists = (contracts[_contractId].sender != address(0));
  }
}
