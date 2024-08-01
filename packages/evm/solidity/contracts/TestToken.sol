// SPDX-License-Identifier: MIT
pragma solidity 0.8.23;

import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

contract TestToken is ERC20, ERC20Permit {
    address public owner;

    constructor() ERC20('Test token for bridge', 'TTFB') ERC20Permit('Test token for bridge') {
        owner = msg.sender;
    }

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
