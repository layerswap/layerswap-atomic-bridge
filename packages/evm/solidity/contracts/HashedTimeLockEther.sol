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
  error NoMessenger();
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
    address payable receiver;
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
  }
  event EtherTransferPreInitiated(
    string[] chains,
    string[] dstAddresses,
    uint phtlcID,
    string dstChain,
    string dstAsset,
    string dstAddress,
    string srcAsset,
    address receiver,
    uint timelock, 
    address messenger,
    uint amount,
    bool refunded,
    bool converted
  );
  event EtherTransferInitiated(
    bytes32 indexed hashlock,
    uint256 amount,
    string chain,
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
  bytes32 [] contractIds;
  uint [] pContractIds;


function createP(string[] memory chains,string[] memory dstAddresses,string memory dstChain,string memory dstAsset, string memory dstAddress,string memory srcAsset,address receiver,uint timelock, address messenger) external payable  returns (uint phtlcID) {
    counter+=1;
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    phtlcID = counter;

    pContracts[phtlcID] = PHTLC(dstAddress,srcAsset,payable(msg.sender),payable(receiver),timelock, messenger,msg.value,false,false);
    pContractIds.push(phtlcID);

    emit EtherTransferPreInitiated(chains,dstAddresses,counter,dstChain,dstAsset,dstAddress,srcAsset,receiver,timelock, messenger,msg.value,false,false);
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
        contracts[htlcID] = HTLC(hashlock, 0x0, pContracts[phtlcID].amount, pContracts[phtlcID].timelock, payable(pContracts[phtlcID].sender), pContracts[phtlcID].receiver, false, false);
    contractIds.push(hashlock);
    emit EtherTransferInitiated(
      hashlock,
      pContracts[phtlcID].amount,
      pContracts[phtlcID].srcAsset,
      pContracts[phtlcID].timelock,
      pContracts[phtlcID].sender,
      pContracts[phtlcID].receiver,
      pContracts[phtlcID].dstAddress,
      phtlcID
    );
    }else{
      revert NoAllowance();
    }
}

function create(
    address payable receiver,
    bytes32 _hashlock,
    uint256 _timelock,
    string memory _chain,
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
    contracts[_hashlock] = HTLC(_hashlock, 0x0, msg.value, _timelock, payable(msg.sender), receiver, false, false);  
    contractIds.push(_hashlock);
    emit EtherTransferInitiated(
        _hashlock,
        msg.value,
        _chain,
        _timelock,
        msg.sender,
        receiver,
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
                receiver,
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
        else {
          revert NoMessenger();
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
    htlc.receiver.transfer(htlc.amount);
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
    address payable receiver,
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
    htlc.receiver,
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
    string memory srcAsset,
    address payable sender,
    address payable receiver,
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
        "0",
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
    phtlc.srcAsset,
    phtlc.sender,
    phtlc.receiver,
    phtlc.timelock, 
    phtlc.messenger,
    phtlc.amount,
    phtlc.refunded,
    phtlc.converted
    );
  }

function hasPHTLC(uint _phtlcID) internal view returns (bool exists) {
    exists = (pContracts[_phtlcID].receiver != address(0));
}

function hasHTLC(bytes32 _htlcId) internal view returns (bool exists) {
    exists = (contracts[_htlcId].sender != address(0));
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