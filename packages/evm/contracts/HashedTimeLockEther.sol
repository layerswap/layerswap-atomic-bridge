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
  error NotReceiver();
  error NotSender();

  struct HTLC {
    address payable sender;
    address payable receiver;
    uint256 amount;
    bytes32 hashlock;
    uint256 timelock;
    bool redeemed;
    bool refunded;
    bytes32 secret;
  }

  mapping(bytes32 => HTLC) contracts;

  event HTLCEtherCreated(
    bytes32 indexed contractId,
    address indexed sender,
    address indexed receiver,
    uint256 amount,
    bytes32 hashlock,
    uint256 timelock
  );
  event HTLCEtherRedeemed(bytes32 indexed contractId);
  event HTLCEtherRefunded(bytes32 indexed contractId);

  modifier contractExists(bytes32 _contractId) {
    if(!hasContract(_contractId)) revert ContractNotExist();
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
    uint256 _timelock
  ) external payable returns (bytes32 contractId){
    if(msg.value == 0){
      revert FundsNotSent();
    }
    if(_timelock <= block.timestamp){
      revert NotFutureTimelock();
    }
    contractId = sha256(abi.encodePacked(msg.sender, _receiver, msg.value, _hashlock, _timelock));
    
    if (hasContract(contractId)){
      revert ContractAlreadyExist();
    }
    contracts[contractId] = HTLC(
      payable(msg.sender),
      _receiver,
      msg.value,
      _hashlock,
      _timelock,
      false,
      false,
      0x0
    );

    emit HTLCEtherCreated(contractId, msg.sender, _receiver, msg.value, _hashlock, _timelock);
  }

  /**
   * @dev Called by the receiver once they know the secret of the hashlock.
   * This will transfer the locked funds to their address.
   *
   * @param _contractId Id of the HTLC.
   * @param _secret sha256(_secret) should equal the contract hashlock.
   * @return bool true on success
   */
  function redeem(bytes32 _contractId, bytes32 _secret)
    external
    contractExists(_contractId)
    returns (bool)
  {
    HTLC storage htlc = contracts[_contractId];

    bytes32 pre = sha256(abi.encodePacked(_secret));
    if(htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if(htlc.receiver != msg.sender) revert NotReceiver();
    if(htlc.refunded) revert AlreadyRefunded();
    if(htlc.redeemed) revert AlreadyRedeemed();
    if(htlc.timelock <= block.timestamp) revert NotFutureTimelock();

    htlc.secret = _secret;
    htlc.redeemed = true;
    htlc.receiver.transfer(htlc.amount);
    emit HTLCEtherRedeemed(_contractId);
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

    if(htlc.sender != msg.sender) revert NotSender();
    if(htlc.refunded) revert AlreadyRefunded();
    if(htlc.redeemed) revert AlreadyRedeemed();
    if(htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.refunded = true;
    htlc.sender.transfer(htlc.amount);
    emit HTLCEtherRefunded(_contractId);
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
      bool redeemed,
      bool refunded,
      bytes32 secret
    )
  {
    if (!hasContract(_contractId)){
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
