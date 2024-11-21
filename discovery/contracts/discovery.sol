
//   _                                                     _      _____                                             _             
//  | |                                                   | |    |  __ \      /\                                   | |            
//  | |     __ _ _   _  ___ _ __ _____      ____ _ _ __   | |    | |__) |    /  \   __ _  __ _ _ __ ___  __ _  __ _| |_ ___  _ __ 
//  | |    / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \  | |    |  ___/    / /\ \ / _` |/ _` | '__/ _ \/ _` |/ _` | __/ _ \| '__|
//  | |___| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | | |____| |       / ____ \ (_| | (_| | | |  __/ (_| | (_| | || (_) | |   
//  |______\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/  |______|_|      /_/    \_\__, |\__, |_|  \___|\__, |\__,_|\__\___/|_|   
//                __/ |                           | |                               __/ | __/ |          __/ |                    
//               |___/                            |_|                              |___/ |___/          |___/                     


// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract LPDiscovery {
    using SafeERC20 for IERC20;
    struct LP {
        string fromChain;
        uint256 fromChainId;
        string fromNativeAsset;
        string fromPreHTLCAddr;
        string fromLPAddr;
        string toChain;
        string toNativeAsset;
        uint256 toChainId;
        string toPreHTLCAddr;
        string toLPAddr;
        uint256 expiryTime; // stored in seconds
        address feePayer;
    }

    event GovernorAssigned(address indexed governor);
    event FeeUpdated(uint256 newFeePerDay);
    event LPRegistered(bytes32 indexed lpKey, address indexed feePayer);
    event DiscoveryTimeExtended(bytes32 indexed lpKey, uint256 newExpiryTime);
    event DiscoveryStopped(
        bytes32 indexed lpKey,
        address indexed feePayer,
        uint256 refundAmount
    );

    mapping(bytes32 => LP) LPs;
    bytes32[] LPKeys;

    // tokensPerDay is price of service for a day in token's smallest unit
    address governor = address(0);
    address creator = address(0);
    IERC20 V8token;
    uint256 tokensPerDay = 1;

    constructor(address V8token_, uint256 tokensPerDay_) {
        V8token = IERC20(V8token_);
        tokensPerDay = tokensPerDay_;
        creator = msg.sender;
    }

    function assignGovernor(address governor_) public returns (address) {
        require(msg.sender == creator, "No Allowance");
        require(governor == address(0), "Governor Already Assigned");
        governor = governor_;
        emit GovernorAssigned(governor);
        return governor;
    }

    function updateFee(
        uint256 tokensPerDay_
    ) public onlyGovernor returns (bool) {
        tokensPerDay = tokensPerDay_;
        emit FeeUpdated(tokensPerDay);
        return true;
    }

    function register(
        string memory fromChain,
        uint256 fromChainId,
        string memory fromNativeAsset,
        string memory fromPreHTLCAddr,
        string memory fromLPAddr,
        string memory toChain,
        string memory toNativeAsset,
        uint256 toChainId,
        string memory toPreHTLCAddr,
        string memory toLPAddr,
        uint256 expiryTimeDays
    ) public returns (bytes32) {
        uint256 tokensAmount = expiryTimeDays * tokensPerDay;
        require(
            V8token.balanceOf(msg.sender) >= tokensAmount,
            "Insufficient Balance"
        );
        require(
            V8token.allowance(msg.sender, address(this)) >= tokensAmount,
            "No Allowance"
        );
        LP memory lp = LP({
            fromChain: fromChain,
            fromChainId: fromChainId,
            fromNativeAsset: fromNativeAsset,
            fromPreHTLCAddr: fromPreHTLCAddr,
            fromLPAddr: fromLPAddr,
            toChain: toChain,
            toNativeAsset: toNativeAsset,
            toChainId: toChainId,
            toPreHTLCAddr: toPreHTLCAddr,
            toLPAddr: toLPAddr,
            expiryTime: block.timestamp + expiryTimeDays * (60 * 60 * 24),
            feePayer: msg.sender
        });
        bytes32 key = _keyForLP_(lp);
        require(!_exists_(key), "LP Already Exists");

        V8token.safeTransferFrom(msg.sender, address(this), tokensAmount);

        LPKeys.push(key);
        LPs[key] = LP({
            fromChain: fromChain,
            fromChainId: fromChainId,
            fromNativeAsset: fromNativeAsset,
            fromPreHTLCAddr: fromPreHTLCAddr,
            fromLPAddr: fromLPAddr,
            toChain: toChain,
            toNativeAsset: toNativeAsset,
            toChainId: toChainId,
            toPreHTLCAddr: toPreHTLCAddr,
            toLPAddr: toLPAddr,
            expiryTime: block.timestamp + expiryTimeDays * (60 * 60 * 24),
            feePayer: msg.sender
        });

        emit LPRegistered(key, msg.sender);
        return key;
    }

    function extendDiscoveryTime(
        bytes32 key,
        uint256 expiryExtensionDay
    ) public returns (bool) {
        LP storage lp = LPs[key];
        uint256 tokensAmount = (expiryExtensionDay * tokensPerDay);
        uint256 newExpiryTime;
        if (_expired_(lp)) {
            newExpiryTime = block.timestamp + expiryExtensionDay * 60 * 60 * 24;
        } else {
            newExpiryTime = lp.expiryTime + expiryExtensionDay * 60 * 60 * 24;
        }

        require(
            V8token.balanceOf(msg.sender) >= tokensAmount,
            "Insufficient Balance"
        );
        require(
            V8token.allowance(msg.sender, address(this)) >= tokensAmount,
            "No Allowance"
        );

        V8token.safeTransferFrom(msg.sender, address(this), tokensAmount);

        lp.expiryTime = newExpiryTime;
        emit DiscoveryTimeExtended(key, newExpiryTime);
        return true;
    }

    function stopDiscovery(bytes32 key) public returns (bool) {
        LP storage lp = LPs[key];
        require(_exists_(key), "Discovery Time Already Expired");
        require(msg.sender == lp.feePayer, "No Allowance");
        uint256 refundAmount = ((lp.expiryTime - block.timestamp) /
            (60 * 60 * 24)) * tokensPerDay;
        lp.expiryTime = 0;
        V8token.safeTransfer(lp.feePayer, refundAmount);
        emit DiscoveryStopped(key, lp.feePayer, refundAmount);
        return true;
    }

    function discover(
        string memory fromChain,
        string memory fromNativeAsset,
        uint256 fromChainId,
        string memory toChain,
        string memory toNativeAsset,
        uint256 toChainId
    ) public view returns (LP[] memory) {
        bytes32 fromChain_ = keccak256(bytes(fromChain));
        bytes32 fromNativeAsset_ = keccak256(bytes(fromNativeAsset));
        bytes32 toChain_ = keccak256(bytes(toChain));
        bytes32 toNativeAsset_ = keccak256(bytes(toNativeAsset));
        uint256 length;
        for (uint256 i = 0; i < LPKeys.length; i++) {
            LP memory lp = LPs[LPKeys[i]];
            if (
                keccak256(bytes(lp.fromChain)) == fromChain_ &&
                keccak256(bytes(lp.fromNativeAsset)) == fromNativeAsset_ &&
                keccak256(bytes(lp.toChain)) == toChain_ &&
                keccak256(bytes(lp.toNativeAsset)) == toNativeAsset_ &&
                fromChainId == lp.fromChainId &&
                toChainId == lp.toChainId &&
                !_expired_(lp)
            ) {
                length++;
            }
        }

        LP[] memory result = new LP[](length);
        uint256 j = 0;
        for (uint256 i = 0; i < LPKeys.length; i++) {
            LP memory lp = LPs[LPKeys[i]];
            if (
                keccak256(bytes(lp.fromChain)) == fromChain_ &&
                keccak256(bytes(lp.fromNativeAsset)) == fromNativeAsset_ &&
                keccak256(bytes(lp.toChain)) == toChain_ &&
                keccak256(bytes(lp.toNativeAsset)) == toNativeAsset_ &&
                fromChainId == lp.fromChainId &&
                toChainId == lp.toChainId &&
                !_expired_(lp)
            ) {
                result[j] = lp;
                j++;
            }
        }

        return result;
    }

    function getLP(bytes32 key) public view returns (LP memory) {
        return LPs[key];
    }

    function getServicePrice() public view returns (uint256) {
        return tokensPerDay;
    }

    function _expired_(LP memory lp) private view returns (bool) {
        return block.timestamp > lp.expiryTime;
    }

    function _exists_(bytes32 key) private view returns (bool) {
        return LPs[key].expiryTime > 0;
    }

    function _keyForLP_(LP memory lp) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    lp.fromChain,
                    lp.fromNativeAsset,
                    lp.fromChainId,
                    lp.fromPreHTLCAddr,
                    lp.fromLPAddr,
                    lp.toChain,
                    lp.toNativeAsset,
                    lp.toChainId,
                    lp.toPreHTLCAddr,
                    lp.toLPAddr
                )
            );
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "No Allowance");
        _;
    }
}
