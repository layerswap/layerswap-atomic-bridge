# Hashed Timelock Contracts (HTLCs)

This part of the repository contains two Solidity smart contracts for implementing Hashed Timelock Contracts (HTLCs) on Ethereum. These contracts enable users to create, manage, and interact with HTLCs, facilitating secure and trustless transactions. The contracts include functions such as creating new HTLCs, redeeming funds locked in HTLCs with a secret hash, and refunding funds in case of expiration or non-redeem. Users can refer to the contract source code and documentation for detailed information on each function's usage and parameters.

## Contracts Overview

### HashedTimelockEther.sol

**Description**: This contract allows users to create HTLCs for Ether. It follows a protocol where a sender can create a new HTLC, a receiver can claim the Ether after revealing the secret, and the sender can refund the Ether if the time lock expires.

#### Functions

- **createHTLC**: Allows a sender to create a new HTLC for Ether by specifying the receiver, hashlock, and timelock.
- **redeem**: Allows the receiver to claim the Ether locked in the HTLC by providing the secret hash.
- **refund**: Allows the sender to refund the Ether if the timelock expires and the receiver has not redeemed the funds.
- **getHTLCDetails**: Retrieves details of a specific HTLC by its contract ID.

### HashedTimelockERC20.sol

**Description**: This contract extends the functionality of HashedTimelockEther.sol to support HTLCs for ERC20 tokens. It allows users to create HTLCs for a specific ERC20 token, transfer tokens upon redemption, and refund tokens if the time lock expires.

#### Functions

- **createHTLC**: Allows a sender to create a new HTLC for ERC20 tokens by specifying the receiver, hashlock, timelock, token contract, and amount.
- **redeem**: Allows the receiver to claim the ERC20 tokens locked in the HTLC by providing the secret hash.
- **refund**: Allows the sender to refund the ERC20 tokens if the timelock expires and the receiver has not redeemed the funds.
- **getHTLCDetails**: Retrieves details of a specific HTLC by its contract ID.


## Deployment

### Prerequisites

- Node.js and npm installed
- Hardhat installed (`npm install --save-dev hardhat`)
- Ethereum network connection (e.g., localhost, sepolia, etc.)
- Ether or test tokens for deployment gas fees

### Steps

1. Clone this repository:

   ```bash
   git clone <repository_url>

2. Navigate to the project directory:

    ```bash
    cd <project_directory>
3. Install dependencies:

    ```bash
    npm install

4. Update deployment scripts (deploy.js):

    - Modify the deployment scripts to set the necessary parameters, such as gas limits, contract constructors, etc.

5. Deploy the contracts:

    ```bash
    npx hardhat run deploy.js [--network <network_name>]

   Replace <network_name> with the desired Ethereum network (e.g., sepolia, mainnet, etc.).

6. Verify the deployed contracts:

    ```bash
    npx hardhat run verify:verify --network <network_name>

   This step is optional but recommended for ensuring contract correctness and transparency.

Usage
Once deployed, users can interact with the contracts using Ethereum wallets or through contract function calls programmatically.

For HashedTimelockEther.sol: Users can create HTLCs for Ether, redeem funds, and request refunds.
For HashedTimelockERC20.sol: Users can create HTLCs for ERC20 tokens, redeem tokens, and request refunds.
Refer to the contract source code for function details and usage instructions.

License
This project is licensed under the MIT License. See the LICENSE file for details.