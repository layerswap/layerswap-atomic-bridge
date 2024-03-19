// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import { ERC20 } from '@openzeppelin/contracts/token/ERC20/ERC20.sol';

contract TestToken is ERC20 {
  address public owner;

  constructor() ERC20('Test token for bridge', 'TTFB') {
    owner = msg.sender;
  }

  function mint(address _to, uint256 _amount) external {
    _mint(_to, _amount);
  }
}
