// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

interface IMessenger {
    function notifyHTLC(
        bytes32 htlcId,
        address payable sender,
        address payable receiver,
        uint256 amount,
        uint256 timelock,
        bytes32 hashlock,
        string memory dstAddress
    ) external;
}

contract SimpleMessenger is IMessenger {
    event HTLCNotificationReceived(
        bytes32 indexed htlcId,
        address payable sender,
        address payable receiver,
        uint256 amount,
        uint256 timelock,
        bytes32 hashlock,
        string dstAddress
    );

    function notifyHTLC(
        bytes32 htlcId,
        address payable sender,
        address payable receiver,
        uint256 amount,
        uint256 timelock,
        bytes32 hashlock,
        string memory dstAddress
    ) external override {
        emit HTLCNotificationReceived(
            htlcId,
            sender,
            receiver,
            amount,
            timelock,
            hashlock,
            dstAddress
        );
    }
}
