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

interface IMessenger {
    function notifyHTLC(
        bytes32 htlcId,
        address payable sender,
        address payable receiver,
        uint256 amount,
        uint256 timelock,
        bytes32 hashlock,
        string memory dstAddress,
        uint256 phtlcID,
        address tokenContract
    ) external;
}

contract HashedTimeLockERC20 {
  error NotFutureTimelock();
  error NotPassedTimelock();
  error HTLCAlreadyExist();
  error HTLCNotExist();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyRefunded();
  error NoMessenger();
  error FundsNotSent();
  error IncorrectData();
  error InsufficientBalance();
  error NoAllowance();
  error PreHTLCNotExists();
  error AlreadyConvertedToHTLC();

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

  struct PHTLC {
    string dstAddress;
    string srcAsset;
    address payable sender;
    address payable receiver;
    uint timelock; 
    address messenger;
    uint amount;
    bool refunded;
    bool converted;
    address tokenContract;
  }

  using SafeERC20 for IERC20;
  mapping(bytes32 => HTLC) contracts;
  mapping(uint256 => PHTLC) pContracts;
  bytes32 [] contractIds;
  uint [] pContractIds;
  uint256 counter = 0;

  event TokenTransferInitiated(
    bytes32 indexed hashlock,
    uint256 amount,
    string chain,
    uint256 timelock,
    address indexed sender,
    address indexed receiver,
    address tokenContract,
    string dstAddress,
    uint256 phtlcID
  );
  event TokenTransferClaimed(bytes32 indexed htlcId);
  event TokenTransferRefunded(bytes32 indexed htlcId);

  event TokenTransferPreInitiated(
    string[] chains,
    string[] dstAddresses,
    uint phtlcID,
    string dstChain,
    string dstAsset,
    string dstAddress,
    address indexed sender,
    string srcAsset,
    address indexed receiver,
    uint timelock, 
    address messenger,
    uint amount,
    address tokenContract
  );

  event LowLevelErrorOccurred(bytes lowLevelData);
  event TokenTransferRefundedP(uint indexed phtlcID);

  modifier phtlcExists(uint _phtlcId) {
        if (!hasPHTLC(_phtlcId)) revert PreHTLCNotExists();
    _;
  }

  modifier htlcExists(bytes32 _htlcId) {
    if (!hasHTLC(_htlcId)) revert HTLCNotExist();
    _;
  }

 function createP(
    string[] memory chains,
    string[] memory dstAddresses,
    string memory dstChain,
    string memory dstAsset,
    string memory dstAddress,
    string memory srcAsset,
    address receiver,
    uint timelock,
    uint amount,
    address messenger,
    address tokenContract
  ) external payable returns (uint phtlcID) {
    if (amount == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    IERC20 token = IERC20(tokenContract);
    counter += 1;
    phtlcID = counter;

    if (token.balanceOf(msg.sender) < amount) {
      revert InsufficientBalance();
    }

    if (token.allowance(msg.sender, address(this)) < amount) {
      revert NoAllowance();
    }

    token.safeTransferFrom(msg.sender, address(this), amount);

    pContracts[phtlcID] = PHTLC(
      dstAddress,
      srcAsset,
      payable(msg.sender),
      payable(receiver),
      timelock,
      messenger,
      amount,
      false,
      false,
      tokenContract
    );
    pContractIds.push(phtlcID);
    emit TokenTransferPreInitiated(
      chains,
      dstAddresses,
      phtlcID,
      dstChain,
      dstAsset,
      dstAddress,
      msg.sender,
      srcAsset,
      receiver,
      timelock,
      messenger,
      amount,
      tokenContract
    );
  }

  function convertP(uint phtlcID, bytes32 hashlock) external phtlcExists(phtlcID) returns (bytes32 htlcID) {
    htlcID = hashlock;
    if (pContracts[phtlcID].refunded == true) {
      revert AlreadyRefunded();
    }
    if (pContracts[phtlcID].converted == true) {
      revert AlreadyConvertedToHTLC();
    }
    if (msg.sender == pContracts[phtlcID].sender || msg.sender == pContracts[phtlcID].messenger) {
      pContracts[phtlcID].converted = true;
      contracts[hashlock] = HTLC(
        hashlock,
        0x0,
        pContracts[phtlcID].amount,
        pContracts[phtlcID].timelock,
        payable(pContracts[phtlcID].sender),
        pContracts[phtlcID].receiver,
        pContracts[phtlcID].tokenContract,
        false,
        false
      );
    contractIds.push(hashlock);
      emit TokenTransferInitiated(
        hashlock,
        pContracts[phtlcID].amount,
        pContracts[phtlcID].srcAsset,
        pContracts[phtlcID].timelock,
        pContracts[phtlcID].sender,
        pContracts[phtlcID].receiver,
        pContracts[phtlcID].tokenContract,
        pContracts[phtlcID].dstAddress,
        phtlcID
      );
    } else {
      revert NoAllowance();
    }
  }

  /**
   * @dev Sender / Payer sets up a new hash time lock contract depositing the
   * funds and providing the reciever and terms.
   * @param _receiver receiver of the funds.
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
    string memory _chain,
    string memory _dstAddress,
    uint256 _phtlcID,
    address _messenger
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

    token.safeTransferFrom(msg.sender, address(this), _amount);
    contracts[htlcId] = HTLC(_hashlock, 0x0, _amount, _timelock, msg.sender, _receiver, _tokenContract, false, false);
    contractIds.push(_hashlock);
    emit TokenTransferInitiated(
      _hashlock,
      _amount,
      _chain,
      _timelock,
      msg.sender,
      _receiver,
      _tokenContract,
      _dstAddress,
      _phtlcID
    );
        if (_messenger != address(0)) {
        uint256 codeSize;
        assembly { codeSize := extcodesize(_messenger) }
        if (codeSize > 0) {
            try IMessenger(_messenger).notifyHTLC(
                _hashlock,
                payable(msg.sender),
                payable(_receiver),
                _amount,
                _timelock,
                _hashlock,
                _dstAddress,
                _phtlcID,
                _tokenContract
            ) {
                // Notify successful
            } catch Error(string memory reason) {
                revert(reason);
            } catch (bytes memory lowLevelData ) {
                emit LowLevelErrorOccurred(lowLevelData);
                revert("IMessenger notifyHTLC failed");
            }
        }
        else {
          revert NoMessenger();
        }
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

    htlc.secret = _secret;
    htlc.redeemed = true;
    IERC20(htlc.tokenContract).safeTransfer(htlc.receiver, htlc.amount);
    emit TokenTransferClaimed(_htlcId);
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

  function refundP(uint _phtlcID) external phtlcExists(_phtlcID) returns (bool){
    PHTLC storage phtlc = pContracts[_phtlcID];

    if(phtlc.refunded) revert AlreadyRefunded();
    if(phtlc.converted) revert AlreadyConvertedToHTLC();
    if(phtlc.timelock > block.timestamp) revert NotPassedTimelock();

    phtlc.refunded = true;
    IERC20(phtlc.tokenContract).safeTransfer(phtlc.sender, phtlc.amount);
    emit TokenTransferRefundedP(_phtlcID);
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

function getPHTLCDetails(
    uint _phtlcId
  )
    public
    view
    returns (
      string memory dstAddress,
      string memory srcAsset,
      address payable sender,
      address payable receiver,
      uint timelock,
      address messenger,
      uint amount,
      bool refunded,
      bool converted,
      address tokenContract
    )
  {
    if (!hasPHTLC(_phtlcId)) {
      return ('0', '0', payable(address(0)), payable(address(0)), 0, address(0), 0, false, false, address(0));
    }
    PHTLC storage phtlc = pContracts[_phtlcId];
    return (
      phtlc.dstAddress,
      phtlc.srcAsset,
      phtlc.sender,
      phtlc.receiver,
      phtlc.timelock,
      phtlc.messenger,
      phtlc.amount,
      phtlc.refunded,
      phtlc.converted,
      phtlc.tokenContract
    );
  }

  /**
   * @dev Check if there is a contract with a given id.
   * @param _htlcId Id into contracts mapping.
   */
  function hasHTLC(bytes32 _htlcId) internal view returns (bool exists) {
    exists = (contracts[_htlcId].sender != address(0));
  }

  function hasPHTLC(uint _phtlcID) internal view returns (bool exists) {
    exists = (pContracts[_phtlcID].sender != address(0));
}

function getHTLContracts(address addr) public view returns(bytes32[] memory) {
    uint count = 0;

    for (uint i = 0; i < contractIds.length; i++) {
      HTLC memory htlc =  contracts[contractIds[i]];
        if (htlc.sender == addr) {
            count++;
        }
    }

    bytes32[] memory result = new bytes32[](count);
    uint j = 0;

    for (uint i = 0; i < contractIds.length; i++) {
        if (contracts[contractIds[i]].sender == addr) {
            result[j] = contractIds[i];
            j++;
        }
    }

    return result;
}

function getPreHTLContracts(address addr) public view returns (uint[] memory) {
    uint count = 0;

    for (uint i = 0; i < pContractIds.length; i++) {
      PHTLC memory phtlc =  pContracts[pContractIds[i]];
        if (phtlc.sender == addr) {
            count++;
        }
    }

    uint[] memory result = new uint[](count);
    uint j = 0;

    for (uint i = 0; i < pContractIds.length; i++) {
        if (pContracts[pContractIds[i]].sender == addr) {
            result[j] = pContractIds[i];
            j++;
        }
    }

    return result;
}
}
