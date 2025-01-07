# AtomicPool Contract

## Overview
The `AtomicPool` contract enables secure, time-locked fund locking and unlocking, integrating with the Layerswap V8 protocol.

## Features
- **Lock Funds**: Create a time-locked pool with a solver.
- **Unlock Funds**: Retrieve funds after the timelock expires.
- **Extend Timelock**: Increase the timelock duration.
- **Punish Solvers**: Penalize solvers for failing conditions using HTLC details.
- **Integration**: Works with Layerswap V8 for HTLC validation.

## Usage
1. **Deploy**: Pass the Layerswap V8 contract address.
2. **Lock**: Use `lockPool` to lock funds with a solver and timelock.
3. **Unlock**: Use `unlockPool` to retrieve funds after the timelock.
4. **Extend**: Use `extendPoolTime` to increase the timelock.
5. **Punish**: Use `punishSolver` with HTLC details and secret.

## Requirements
- **Solidity**: ^0.8.23
- **Dependencies**: OpenZeppelin `ReentrancyGuard`, Layerswap V8 Interface
