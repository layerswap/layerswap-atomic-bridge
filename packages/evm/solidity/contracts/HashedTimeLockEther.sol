// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

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


contract HashedTimeLockEther {
  uint256 private counter = 0;
  
  error FundsNotSent();
  error NotFutureTimelock();
  error NotPassedTimelock();
  error ContractAlreadyExist();
  error HTLCNotExists();
  error HashlockNotMatch();
  error AlreadyRedeemed();
  error AlreadyRefunded();
  error IncorrectData();
  error PreHTLCNotExists();
  error AlreadyConvertedToHTLC();
  error NoAllowance();

  struct HTLC {
    bytes32 hashlock;
    bytes32 secret;
    uint256 amount;
    uint256 timelock;
    address payable sender;
    address payable srcAddress;
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
  }

  event EtherTransferPreInitiated(
    uint[] chainIds,
    string[] dstAddresses,
    uint phtlcID,
    uint dstChainId,
    uint dstAssetId,
    string dstAddress,
    uint srcAssetId,
    address srcAddress,
    uint timelock, 
    address messenger,
    uint amount,
    bool refunded,
    bool converted
  );
  event EtherTransferInitiated(
    bytes32 indexed hashlock,
    uint256 amount,
    uint256 chainID,
    uint256 timelock,
    address indexed sender,
    address indexed receiver,
    string dstAddress,
    uint phtlcID
  );

  event LowLevelErrorOccurred(bytes lowLevelData);
  event EtherTransferRefunded(bytes32 indexed htlcId);
  event EtherTransferRefundedP(uint indexed phtlcId);
  event EtherTransferClaimed(bytes32 indexed htlcId,address redeemAddress);

  modifier phtlcExists(uint _phtlcId) {
        if (!hasPHTLC(_phtlcId)) revert PreHTLCNotExists();
    _;
  }

  modifier htlcExists(bytes32 _htlcId) {
    if (!hasHTLC(_htlcId)) revert HTLCNotExists();
    _;
  }

  mapping(bytes32 => HTLC) contracts;
  mapping(uint => PHTLC) pContracts;


function createP(uint[] memory chainIds,string[] memory dstAddresses,uint dstChainId,uint dstAssetId, string memory dstAddress,uint srcAssetId,address srcAddress,uint timelock, address messenger) external payable  returns (uint phtlcID) {
    counter+=1;
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    phtlcID = counter;

    pContracts[phtlcID] = PHTLC(dstAddress,srcAssetId,payable(msg.sender),payable(srcAddress),timelock, messenger,msg.value,false,false);

    emit EtherTransferPreInitiated(chainIds,dstAddresses,counter,dstChainId,dstAssetId,dstAddress,srcAssetId,srcAddress,timelock, messenger,msg.value,false,false);
}

function createPBatch(
  uint[][] memory chainIds,
  string[][] memory dstAddresses,
  uint[] memory dstChainId,
  uint[] memory dstAssetId,
  string[] memory dstAddress,
  uint[] memory srcAssetId,
  address[] memory srcAddress,
  uint[] memory timelock,
  address[] memory messenger,
  uint[] memory amount
) external payable returns (uint[] memory phtlcIDs) {
  uint totalAmount = 0;
  for (uint256 i = 0; i < amount.length; i++) {
    if (amount[i] == 0) {
      revert FundsNotSent();
    }
    totalAmount += amount[i];
  }

  if (
    chainIds.length != dstAddresses.length ||
    chainIds.length != dstChainId.length ||
    chainIds.length != dstAssetId.length ||
    chainIds.length != dstAddress.length ||
    chainIds.length != srcAssetId.length ||
    chainIds.length != srcAddress.length ||
    chainIds.length != timelock.length ||
    chainIds.length != messenger.length ||
    chainIds.length != amount.length ||
    msg.value != totalAmount
  ) {
    revert IncorrectData();
  }

  phtlcIDs = new uint[](amount.length);
  for (uint256 i = 0; i < srcAddress.length; i++) {
    if (timelock[i] <= block.timestamp) {
      revert NotFutureTimelock();
    }

    counter += 1;

    phtlcIDs[i] = counter;

    pContracts[counter] = PHTLC(
      dstAddress[i],
      srcAssetId[i],
      payable(msg.sender),
      payable(srcAddress[i]),
      timelock[i],
      messenger[i],
      amount[i],
      false,
      false
    );

    emit EtherTransferPreInitiated(
      chainIds[i],
      dstAddresses[i],
      counter,
      dstChainId[i],
      dstAssetId[i],
      dstAddress[i],
      srcAssetId[i],
      srcAddress[i],
      timelock[i],
      messenger[i],
      amount[i],
      false,
      false
    );
  }
  return phtlcIDs;
}

function refundP(uint _phtlcID) external phtlcExists(_phtlcID) returns (bool){
    PHTLC storage phtlc = pContracts[_phtlcID];

    if(phtlc.refunded) revert AlreadyRefunded();
    if(phtlc.converted) revert AlreadyConvertedToHTLC();
    if(phtlc.timelock > block.timestamp) revert NotPassedTimelock();

    phtlc.refunded = true;
    phtlc.sender.transfer(phtlc.amount);
    emit EtherTransferRefundedP(_phtlcID);
    return true;
}

function convertP(uint phtlcID, bytes32 hashlock) external phtlcExists(phtlcID) returns (bytes32 htlcID){
    htlcID = hashlock;
    if(msg.sender == pContracts[phtlcID].sender || msg.sender == pContracts[phtlcID].messenger) {
        if(pContracts[phtlcID].converted == true){
          revert AlreadyConvertedToHTLC();
        }
        pContracts[phtlcID].converted = true;
        contracts[htlcID] = HTLC(hashlock, 0x0, pContracts[phtlcID].amount, pContracts[phtlcID].timelock, payable(pContracts[phtlcID].sender), pContracts[phtlcID].srcAddress, false, false);

    emit EtherTransferInitiated(
      hashlock,
      pContracts[phtlcID].amount,
      pContracts[phtlcID].srcAssetId,
      pContracts[phtlcID].timelock,
      pContracts[phtlcID].sender,
      pContracts[phtlcID].srcAddress,
      pContracts[phtlcID].dstAddress,
      phtlcID
    );
    }else{
      revert NoAllowance();
    }
}

function convertPBatch(uint[] memory phtlcIDs, bytes32[] memory hashlocks) external returns (bytes32[] memory htlcIDs) {
  if (phtlcIDs.length != hashlocks.length) {
    revert IncorrectData();
  }

  htlcIDs = new bytes32[](phtlcIDs.length);

  for (uint i = 0; i < phtlcIDs.length; i++) {
    if (!hasPHTLC(phtlcIDs[i])) {
      revert PreHTLCNotExists();
    }

    if(pContracts[phtlcIDs[i]].converted == true){
      revert AlreadyConvertedToHTLC();
    }

    if (msg.sender == pContracts[phtlcIDs[i]].sender || msg.sender == pContracts[phtlcIDs[i]].messenger) {
      pContracts[phtlcIDs[i]].converted = true;
      htlcIDs[i] = hashlocks[i];
      contracts[htlcIDs[i]] = HTLC(
        hashlocks[i],
        0x0,
        pContracts[phtlcIDs[i]].amount,
        pContracts[phtlcIDs[i]].timelock,
        payable(pContracts[phtlcIDs[i]].sender),
        pContracts[phtlcIDs[i]].srcAddress,
        false,
        false
      );

      emit EtherTransferInitiated(
        hashlocks[i],
        pContracts[phtlcIDs[i]].amount,
        pContracts[phtlcIDs[i]].srcAssetId,
        pContracts[phtlcIDs[i]].timelock,
        pContracts[phtlcIDs[i]].sender,
        pContracts[phtlcIDs[i]].srcAddress,
        pContracts[phtlcIDs[i]].dstAddress,
        phtlcIDs[i]
      );
    } else {
      revert NoAllowance();
    }
  }

  return htlcIDs;
}

function create(
    address payable srcAddress,
    bytes32 _hashlock,
    uint256 _timelock,
    uint256 _chainID,
    string memory _dstAddress,
    uint phtlcID,
    address messenger
) external payable returns (bytes32 htlcId) {
    if (msg.value == 0) {
        revert FundsNotSent();
    }
    if (_timelock <= block.timestamp) {
        revert NotFutureTimelock();
    }
    if (hasHTLC(_hashlock)) {
        revert ContractAlreadyExist();
    }

    htlcId = _hashlock;
    contracts[_hashlock] = HTLC(_hashlock, 0x0, msg.value, _timelock, payable(msg.sender), srcAddress, false, false);

    emit EtherTransferInitiated(
        _hashlock,
        msg.value,
        _chainID,
        _timelock,
        msg.sender,
        srcAddress,
        _dstAddress,
        phtlcID
    );

    if (messenger != address(0)) {
        uint256 codeSize;
        assembly { codeSize := extcodesize(messenger) }
        if (codeSize > 0) {
            try IMessenger(messenger).notifyHTLC(
                _hashlock,
                payable(msg.sender),
                srcAddress,
                msg.value,
                _timelock,
                _hashlock,
                _dstAddress,
                phtlcID,
                address(0)
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

  function redeem(bytes32 _htlcId, bytes32 _secret) external htlcExists(_htlcId) returns (bool) {
    HTLC storage htlc = contracts[_htlcId];

    bytes32 pre = sha256(abi.encodePacked(_secret));
    if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();

    htlc.secret = _secret;
    htlc.redeemed = true;
    htlc.srcAddress.transfer(htlc.amount);
    emit EtherTransferClaimed(_htlcId,msg.sender);
    return true;
  }

  function refund(bytes32 _htlcId) external htlcExists(_htlcId) returns (bool) {
    HTLC storage htlc = contracts[_htlcId];

    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock > block.timestamp) revert NotPassedTimelock();

    htlc.refunded = true;
    htlc.sender.transfer(htlc.amount);
    emit EtherTransferRefunded(_htlcId);
    return true;
  }

   function createBatch(
    address[] memory _srcAddresses,
    bytes32[] memory _hashlocks,
    uint256[] memory _timelocks,
    uint256[] memory _chainIDs,
    string[] memory _dstAddresses,
    uint[] memory _amounts,
    uint[] memory _phtlcIds,
    address[] memory messengers
  ) external payable returns (bytes32[] memory htlcIds) {
    
    htlcIds = new bytes32[](_srcAddresses.length);
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
      _srcAddresses.length == 0 ||
      _srcAddresses.length != _hashlocks.length ||
      _srcAddresses.length != _timelocks.length ||
      _srcAddresses.length != _chainIDs.length ||
      _srcAddresses.length != _dstAddresses.length ||
      _srcAddresses.length != _phtlcIds.length ||
      _srcAddresses.length != messengers.length ||
      result != msg.value
    ) {
      revert IncorrectData();
    }

    for (uint i = 0; i < _srcAddresses.length; i++) {
      if (_timelocks[i] <= block.timestamp) {
        revert NotFutureTimelock();
      }
      htlcIds[i] = _hashlocks[i];

      if (hasHTLC(htlcIds[i])) {
        revert ContractAlreadyExist();
      }

      contracts[htlcIds[i]] = HTLC(
        _hashlocks[i],
        0x0,
        _amounts[i],
        _timelocks[i],
        payable(msg.sender),
        payable(_srcAddresses[i]),
        false,
        false
      );

      emit EtherTransferInitiated(
        _hashlocks[i],
        _amounts[i],
        _chainIDs[i],
        _timelocks[i],
        msg.sender,
        _srcAddresses[i],
        _dstAddresses[i],
        _phtlcIds[i]
      );

          if (messengers[i] != address(0)) {
        uint256 codeSize;
        address currentMessenger = messengers[i];
        assembly { codeSize := extcodesize(currentMessenger) }
        if (codeSize > 0) {
            try IMessenger(messengers[i]).notifyHTLC(
                _hashlocks[i],
                payable(msg.sender),
                payable(_srcAddresses[i]),
                msg.value,
                _timelocks[i],
                _hashlocks[i],
                _dstAddresses[i],
                _phtlcIds[i],
                address(0)
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

  function batchRedeem(bytes32[] memory _htlcIds, bytes32[] memory _secrets) external returns (bool) {
    if (_htlcIds.length != _secrets.length) {
      revert IncorrectData();
    }
    for (uint256 i; i < _htlcIds.length; i++) {
      if (!hasHTLC(_htlcIds[i])) revert HTLCNotExists();
    }
    uint256 totalToRedeem;
    address payable _receiver = contracts[_htlcIds[0]].srcAddress;
    for (uint256 i; i < _htlcIds.length; i++) {
      HTLC storage htlc = contracts[_htlcIds[i]];
      bytes32 pre = sha256(abi.encodePacked(_secrets[i]));
      if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
      if (htlc.refunded) revert AlreadyRefunded();
      if (htlc.redeemed) revert AlreadyRedeemed();
      if (htlc.timelock <= block.timestamp) revert NotFutureTimelock();

      htlc.secret = _secrets[i];
      htlc.redeemed = true;
      if (_receiver == htlc.srcAddress) {
        totalToRedeem += htlc.amount;
      } else {
        htlc.srcAddress.transfer(htlc.amount);
      }
      emit EtherTransferClaimed(_htlcIds[i],msg.sender);
    }
    _receiver.transfer(totalToRedeem);
    return true;
  }

  function getHTLCDetails(
    bytes32 _htlcId
  )
    public
    view
    returns (
    bytes32 hashlock,
    bytes32 secret,
    uint256 amount,
    uint256 timelock,
    address payable sender,
    address payable srcAddress,
    bool redeemed,
    bool refunded
    )
  {
    if (!hasHTLC(_htlcId)) {
      return (
        bytes32(0x0),
        bytes32(0x0),
        uint256(0),
        uint256(0),
        payable(address(0)),
        payable(address(0)),
        false,
        false
        );
    }
    HTLC storage htlc = contracts[_htlcId];
    return (
    htlc.hashlock,
    htlc.secret,
    htlc.amount,
    htlc.timelock,
    htlc.sender,
    htlc.srcAddress,
    htlc.redeemed,
    htlc.refunded
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
    bool converted
    )
  {
    if (!hasPHTLC(_phtlcId)) {
      return (
        "0",
        0,
        payable(address(0)),
        payable(address(0)),
        0,
        address(0),
        0,
        false,
        false
        );
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
    phtlc.converted
    );
  }

function hasPHTLC(uint _phtlcID) internal view returns (bool exists) {
    exists = (pContracts[_phtlcID].srcAddress != address(0));
}

function hasHTLC(bytes32 _htlcId) internal view returns (bool exists) {
    exists = (contracts[_htlcId].sender != address(0));
}

}