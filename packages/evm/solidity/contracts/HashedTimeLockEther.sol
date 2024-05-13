// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;
import '@openzeppelin/contracts/token/common/ERC2981.sol';

interface IMessenger {
    function notifyHTLC(
        bytes32 htlcId,
        address payable sender,
        address payable receiver,
        uint256 amount,
        uint256 timelock,
        bytes32 hashlock,
        string memory dstAddress,
        uint phtlcID
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

  event EtherTransferRefunded(bytes32 indexed htlcId);
  event EtherTransferRefunded(uint indexed phtlcId);
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


function createP(uint dstChainId,uint dstAssetId, string memory dstAddress,uint srcAssetId,address srcAddress,uint timelock, address messenger) external payable  returns (uint phtlcID) {
    counter+=1;
    if (msg.value == 0) {
      revert FundsNotSent();
    }
    if (timelock <= block.timestamp) {
      revert NotFutureTimelock();
    }

    phtlcID = counter;

    if(hasPHTLC(phtlcID)){
      revert ContractAlreadyExist();
    }

    pContracts[phtlcID] = PHTLC(dstAddress,srcAssetId,payable(msg.sender),payable(srcAddress),timelock, messenger,msg.value,false,false);

    emit EtherTransferPreInitiated(dstChainId,dstAssetId,dstAddress,srcAssetId,srcAddress,timelock, messenger,msg.value,false,false);
}

function refundP(uint _phtlcID) external phtlcExists(_phtlcID) returns (bool){
    PHTLC storage phtlc = pContracts[_phtlcID];

    if(phtlc.refunded) revert AlreadyRefunded();
    if(phtlc.converted) revert AlreadyConvertedToHTLC();
    if(phtlc.timelock > block.timestamp) revert NotPassedTimelock();

    phtlc.refunded = true;
    phtlc.sender.transfer(phtlc.amount);
    emit EtherTransferRefunded(_phtlcID);
    return true;
}

function convertP(uint phtlcID, bytes32 hashlock) external phtlcExists(phtlcID) returns (bytes32 htlcID){
    htlcID = hashlock;
    if(msg.sender == pContracts[phtlcID].sender || msg.sender == pContracts[phtlcID].messenger) {
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
    }
}

function create(
    address payable srcAddress,
    bytes32 _hashlock,
    uint256 _timelock,
    uint256 _chainID,
    string memory _targetCurrencyReceiverAddress,
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

     IMessenger(messenger).notifyHTLC(
            _hashlock,
            payable(msg.sender),
            srcAddress,
            msg.value,
            _timelock,
            _hashlock,
            _targetCurrencyReceiverAddress,
            phtlcID
        );

    emit EtherTransferInitiated(
      _hashlock,
      msg.value,
      _chainID,
      _timelock,
      msg.sender,
      srcAddress,
      _targetCurrencyReceiverAddress,
      phtlcID
    );
  }


  function redeem(bytes32 _htlcId, bytes32 _secret) external htlcExists(_htlcId) returns (bool) {
    HTLC storage htlc = contracts[_htlcId];

    bytes32 pre = sha256(abi.encodePacked(_secret));
    if (htlc.hashlock != sha256(abi.encodePacked(pre))) revert HashlockNotMatch();
    if (htlc.refunded) revert AlreadyRefunded();
    if (htlc.redeemed) revert AlreadyRedeemed();
    if (htlc.timelock <= block.timestamp) revert NotFutureTimelock();

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