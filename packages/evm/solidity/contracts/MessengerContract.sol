// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IMessenger {
  function notify(
    uint256 commitId,
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
    uint256 commitId,
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
    uint256 commitId,
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
