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
 *  1) create(srcAddress, hashlock, timelock, tokenContract, amount) - a
 *      sender calls this to create a new HTLC on a given token (tokenContract)
 *       for a given amount. A 32 byte contract id is returned
 *  2) redeem(contractId, secret) - once the srcAddress knows the secret of
 *      the hashlock hash they can claim the tokens with this function
 *  3) refund() - after timelock has expired and if the srcAddress did not
 *      redeem the tokens the sender / creator of the HTLC can get their tokens
 *      back with this function.
 */

interface IMessenger {
    function notifyHTLC(
        bytes32 htlcId,
        address payable sender,
        address payable srcAddress,
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
    address srcAddress;
    address tokenContract;
    bool redeemed;
    bool refunded;
  }

  struct PHTLC {
    string dstAddress;
    uint srcAssetId;
    address payable sender;
    address payable srcAddress;
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
  uint256 counter = 0;

  event TokenTransferInitiated(
    bytes32 indexed hashlock,
    uint256 amount,
    uint256 chainId,
    uint256 timelock,
    address indexed sender,
    address indexed srcAddress,
    address tokenContract,
    string dstAddress,
    uint256 phtlcID
  );
  event TokenTransferClaimed(bytes32 indexed htlcId);
  event TokenTransferRefunded(bytes32 indexed htlcId);

  event TokenTransferPreInitiated(
    uint[] chainIds,
    string[] dstAddresses,
    uint phtlcID,
    uint dstChainId,
    uint dstAssetId,
    string dstAddress,
    address indexed sender,
    uint srcAssetId,
    address indexed srcAddress,
    uint timelock, 
    address messenger,
    uint amount,
    address tokenContract
  );

  event LowLevelErrorOccurred(bytes lowLevelData);
  event TokenTransferRefundedP(uint indexed phtlcId);

  modifier phtlcExists(uint _phtlcId) {
        if (!hasPHTLC(_phtlcId)) revert PreHTLCNotExists();
    _;
  }

  modifier htlcExists(bytes32 _htlcId) {
    if (!hasHTLC(_htlcId)) revert HTLCNotExist();
    _;
  }

 function createP(
    uint[] memory chainIds,
    string[] memory dstAddresses,
    uint dstChainId,
    uint dstAssetId,
    string memory dstAddress,
    uint srcAssetId,
    address srcAddress,
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
      srcAssetId,
      payable(msg.sender),
      payable(srcAddress),
      timelock,
      messenger,
      amount,
      false,
      false,
      tokenContract
    );

    emit TokenTransferPreInitiated(
      chainIds,
      dstAddresses,
      phtlcID,
      dstChainId,
      dstAssetId,
      dstAddress,
      msg.sender,
      srcAssetId,
      srcAddress,
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
        pContracts[phtlcID].srcAddress,
        pContracts[phtlcID].tokenContract,
        false,
        false
      );

      emit TokenTransferInitiated(
        hashlock,
        pContracts[phtlcID].amount,
        pContracts[phtlcID].srcAssetId,
        pContracts[phtlcID].timelock,
        pContracts[phtlcID].sender,
        pContracts[phtlcID].srcAddress,
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
   * @param _srcAddress srcAddress of the funds.
   * @param _hashlock A sha-256 hash hashlock.
   * @param _timelock UNIX epoch seconds time that the lock expires at.
   *                  Refunds can be made after this time.
   * @return htlcId Id of the new HTLC. This is needed for subsequent
   *                    calls.
   */

  function create(
    address _srcAddress,
    bytes32 _hashlock,
    uint256 _timelock,
    address _tokenContract,
    uint256 _amount,
    uint256 _chainID,
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
    contracts[htlcId] = HTLC(_hashlock, 0x0, _amount, _timelock, msg.sender, _srcAddress, _tokenContract, false, false);

    emit TokenTransferInitiated(
      _hashlock,
      _amount,
      _chainID,
      _timelock,
      msg.sender,
      _srcAddress,
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
                payable(_srcAddress),
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
    }
  }

  function batchCreate(
    address[] memory _srcAddresses,
    bytes32[] memory _hashlocks,
    uint256[] memory _timelocks,
    address[] memory _tokenContracts,
    uint256[] memory _amounts,
    uint256[] memory _chainIDs,
    string[] memory _dstAddresses,
    address[] memory _messengers,
    uint256[] memory _phtlcIDs
  ) external payable returns (bytes32[] memory htlcIds) {
    if (
      _srcAddresses.length == 0 ||
      _srcAddresses.length != _hashlocks.length ||
      _srcAddresses.length != _timelocks.length ||
      _srcAddresses.length != _chainIDs.length ||
      _srcAddresses.length != _dstAddresses.length ||
      _srcAddresses.length != _amounts.length ||
      _srcAddresses.length != _tokenContracts.length ||
      _srcAddresses.length != _messengers.length ||
      _srcAddresses.length != _phtlcIDs.length
    ) {
      revert IncorrectData();
    }

    htlcIds = new bytes32[](_srcAddresses.length);

    for (uint256 i = 0; i < _srcAddresses.length; i++) {
      if (_timelocks[i] <= block.timestamp) {
        revert NotFutureTimelock();
      }
      if (_amounts[i] == 0) {
        revert FundsNotSent();
      }
    }

    for (uint256 i = 0; i < _srcAddresses.length; i++) {
      htlcIds[i] = _hashlocks[i];

      if (hasHTLC(htlcIds[i])) {
        revert HTLCAlreadyExist();
      }

      IERC20 token = IERC20(_tokenContracts[i]);

      if (token.balanceOf(msg.sender) < _amounts[i]) {
        revert InsufficientBalance();
      }

      if (token.allowance(msg.sender, address(this)) < _amounts[i]) {
        revert NoAllowance();
      }

      token.safeTransferFrom(msg.sender, _srcAddresses[i], _amounts[i]);
      contracts[htlcIds[i]] = HTLC(
        _hashlocks[i],
        0x0,
        _amounts[i],
        _timelocks[i],
        msg.sender,
        _srcAddresses[i],
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
        _srcAddresses[i],
        _tokenContracts[i],
        _dstAddresses[i],
        _phtlcIDs[i]
      );

      if (_messengers[i] != address(0)) {
        uint256 codeSize;
        address currentMessenger = _messengers[i];
        assembly { codeSize := extcodesize(currentMessenger) }
        if (codeSize > 0) {
            try IMessenger(_messengers[i]).notifyHTLC(
                _hashlocks[i],
                payable(msg.sender),
                payable(_srcAddresses[i]),
                _amounts[i],
                _timelocks[i],
                _hashlocks[i],
                _dstAddresses[i],
                _phtlcIDs[i],
                _tokenContracts[i]
            ) {
                // Notify successful
            } catch Error(string memory reason) {
                revert(reason);
            } catch (bytes memory lowLevelData ) {
                emit LowLevelErrorOccurred(lowLevelData);
                revert("IMessenger notifyHTLC failed");
            }
        }
      }
    }
  }

  /**
   * @dev Called by the srcAddress once they know the secret of the hashlock.
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
    IERC20(htlc.tokenContract).safeTransfer(htlc.srcAddress, htlc.amount);
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

      htlc.secret = _secrets[i];
      htlc.redeemed = true;
      IERC20(htlc.tokenContract).safeTransfer(htlc.srcAddress, htlc.amount);
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
      address srcAddress,
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
      htlc.srcAddress,
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
      uint srcAssetId,
      address payable sender,
      address payable srcAddress,
      uint timelock,
      address messenger,
      uint amount,
      bool refunded,
      bool converted,
      address tokenContract
    )
  {
    if (!hasPHTLC(_phtlcId)) {
      return ('0', 0, payable(address(0)), payable(address(0)), 0, address(0), 0, false, false, address(0));
    }
    PHTLC storage phtlc = pContracts[_phtlcId];
    return (
      phtlc.dstAddress,
      phtlc.srcAssetId,
      phtlc.sender,
      phtlc.srcAddress,
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
}
