// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IMessenger {
  function notify(
    bytes32 commitId,
    bytes32 hashlock,
    string memory dstChain,
    string memory dstAsset,
    string memory dstAddress,
    string memory srcAsset,
    address payable sender,
    address payable srcReciever,
    uint256 amount,
    uint256 timelock,
    address tokenContract
  ) external;
}

contract SimpleMessenger is IMessenger {
  event NotificationReceived(
    bytes32 indexed lockId,
    bytes32 commitId,
    bytes32 hashlock,
    string dstChain,
    string dstAsset,
    string dstAddress,
    string srcAsset,
    address payable sender,
    address payable srcReciever,
    uint256 amount,
    uint256 timelock,
    address tokenContract
  );

  function notify(
    bytes32 commitId,
    bytes32 hashlock,
    string memory dstChain,
    string memory dstAsset,
    string memory dstAddress,
    string memory srcAsset,
    address payable sender,
    address payable srcReciever,
    uint256 amount,
    uint256 timelock,
    address tokenContract
  ) public override {
    emit NotificationReceived(
      hashlock,
      commitId,
      hashlock,
      dstChain,
      dstAsset,
      dstAddress,
      srcAsset,
      sender,
      srcReciever,
      amount,
      timelock,
      tokenContract
    );
  }
}