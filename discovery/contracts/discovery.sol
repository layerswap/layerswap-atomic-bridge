
//   _                                                    __      _____     _____       _                                                           _             
//  | |                                                   \ \    / / _ \   / ____|     | |                    /\                                   | |            
//  | |     __ _ _   _  ___ _ __ _____      ____ _ _ __    \ \  / / (_) | | (___   ___ | |_   _____ _ __     /  \   __ _  __ _ _ __ ___  __ _  __ _| |_ ___  _ __ 
//  | |    / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \    \ \/ / > _ <   \___ \ / _ \| \ \ / / _ \ '__|   / /\ \ / _` |/ _` | '__/ _ \/ _` |/ _` | __/ _ \| '__|
//  | |___| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) |    \  / | (_) |  ____) | (_) | |\ V /  __/ |     / ____ \ (_| | (_| | | |  __/ (_| | (_| | || (_) | |   
//  |______\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/      \/   \___/  |_____/ \___/|_| \_/ \___|_|    /_/    \_\__, |\__, |_|  \___|\__, |\__,_|\__\___/|_|   
//                __/ |                           | |                                                               __/ | __/ |          __/ |                    
//               |___/                            |_|                                                              |___/ |___/          |___/                     

// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract SolverDiscovery {
    using SafeERC20 for IERC20;
    struct Solver {
        string fromChain;
        uint256 fromChainId;
        string fromNativeAsset;
        string fromPreHTLCAddr;
        string fromSolverAddr;
        string toChain;
        string toNativeAsset;
        uint256 toChainId;
        string toPreHTLCAddr;
        string toSolverAddr;
        uint256 expiryTime; // stored in seconds
        address feePayer;
    }

    event GovernorAssigned(address indexed governor);
    event FeeUpdated(uint256 newFeePerDay);
    event SolverRegistered(bytes32 indexed SolverKey, address indexed feePayer);
    event DiscoveryTimeExtended(bytes32 indexed SolverKey, uint256 newExpiryTime);
    event DiscoveryStopped(
        bytes32 indexed SolverKey,
        address indexed feePayer,
        uint256 refundAmount
    );

    mapping(bytes32 => Solver) Solvers;
    bytes32[] SolverKeys;

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
        string memory fromSolverAddr,
        string memory toChain,
        string memory toNativeAsset,
        uint256 toChainId,
        string memory toPreHTLCAddr,
        string memory toSolverAddr,
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
        Solver memory solver = Solver({
            fromChain: fromChain,
            fromChainId: fromChainId,
            fromNativeAsset: fromNativeAsset,
            fromPreHTLCAddr: fromPreHTLCAddr,
            fromSolverAddr: fromSolverAddr,
            toChain: toChain,
            toNativeAsset: toNativeAsset,
            toChainId: toChainId,
            toPreHTLCAddr: toPreHTLCAddr,
            toSolverAddr: toSolverAddr,
            expiryTime: block.timestamp + expiryTimeDays * (60 * 60 * 24),
            feePayer: msg.sender
        });
        bytes32 key = _keyForSolver_(solver);
        require(!_exists_(key), "Solver Already Exists");

        V8token.safeTransferFrom(msg.sender, address(this), tokensAmount);

        SolverKeys.push(key);
        Solvers[key] = Solver({
            fromChain: fromChain,
            fromChainId: fromChainId,
            fromNativeAsset: fromNativeAsset,
            fromPreHTLCAddr: fromPreHTLCAddr,
            fromSolverAddr: fromSolverAddr,
            toChain: toChain,
            toNativeAsset: toNativeAsset,
            toChainId: toChainId,
            toPreHTLCAddr: toPreHTLCAddr,
            toSolverAddr: toSolverAddr,
            expiryTime: block.timestamp + expiryTimeDays * (60 * 60 * 24),
            feePayer: msg.sender
        });

        emit SolverRegistered(key, msg.sender);
        return key;
    }

    function extendDiscoveryTime(
        bytes32 key,
        uint256 expiryExtensionDay
    ) public returns (bool) {
        Solver storage solver = Solvers[key];
        uint256 tokensAmount = (expiryExtensionDay * tokensPerDay);
        uint256 newExpiryTime;
        if (_expired_(solver)) {
            newExpiryTime = block.timestamp + expiryExtensionDay * 60 * 60 * 24;
        } else {
            newExpiryTime = solver.expiryTime + expiryExtensionDay * 60 * 60 * 24;
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

        solver.expiryTime = newExpiryTime;
        emit DiscoveryTimeExtended(key, newExpiryTime);
        return true;
    }

    function stopDiscovery(bytes32 key) public returns (bool) {
        Solver storage solver = Solvers[key];
        require(_exists_(key), "Discovery Time Already Expired");
        require(msg.sender == solver.feePayer, "No Allowance");
        uint256 refundAmount = ((solver.expiryTime - block.timestamp) /
            (60 * 60 * 24)) * tokensPerDay;
        solver.expiryTime = 0;
        V8token.safeTransfer(solver.feePayer, refundAmount);
        emit DiscoveryStopped(key, solver.feePayer, refundAmount);
        return true;
    }

    function discover(
        string memory fromChain,
        string memory fromNativeAsset,
        uint256 fromChainId,
        string memory toChain,
        string memory toNativeAsset,
        uint256 toChainId
    ) public view returns (Solver[] memory) {
        bytes32 fromChain_ = keccak256(bytes(fromChain));
        bytes32 fromNativeAsset_ = keccak256(bytes(fromNativeAsset));
        bytes32 toChain_ = keccak256(bytes(toChain));
        bytes32 toNativeAsset_ = keccak256(bytes(toNativeAsset));
        uint256 length;
        for (uint256 i = 0; i < SolverKeys.length; i++) {
            Solver memory solver = Solvers[SolverKeys[i]];
            if (
                keccak256(bytes(solver.fromChain)) == fromChain_ &&
                keccak256(bytes(solver.fromNativeAsset)) == fromNativeAsset_ &&
                keccak256(bytes(solver.toChain)) == toChain_ &&
                keccak256(bytes(solver.toNativeAsset)) == toNativeAsset_ &&
                fromChainId == solver.fromChainId &&
                toChainId == solver.toChainId &&
                !_expired_(solver)
            ) {
                length++;
            }
        }

        Solver[] memory result = new Solver[](length);
        uint256 j = 0;
        for (uint256 i = 0; i < SolverKeys.length; i++) {
            Solver memory solver = Solvers[SolverKeys[i]];
            if (
                keccak256(bytes(solver.fromChain)) == fromChain_ &&
                keccak256(bytes(solver.fromNativeAsset)) == fromNativeAsset_ &&
                keccak256(bytes(solver.toChain)) == toChain_ &&
                keccak256(bytes(solver.toNativeAsset)) == toNativeAsset_ &&
                fromChainId == solver.fromChainId &&
                toChainId == solver.toChainId &&
                !_expired_(solver)
            ) {
                result[j] = solver;
                j++;
            }
        }

        return result;
    }

    function getSolver(bytes32 key) public view returns (Solver memory) {
        return Solvers[key];
    }

    function getServicePrice() public view returns (uint256) {
        return tokensPerDay;
    }

    function _expired_(Solver memory solver) private view returns (bool) {
        return block.timestamp > solver.expiryTime;
    }

    function _exists_(bytes32 key) private view returns (bool) {
        return Solvers[key].expiryTime > 0;
    }

    function _keyForSolver_(Solver memory solver) private pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    solver.fromChain,
                    solver.fromNativeAsset,
                    solver.fromChainId,
                    solver.fromPreHTLCAddr,
                    solver.fromSolverAddr,
                    solver.toChain,
                    solver.toNativeAsset,
                    solver.toChainId,
                    solver.toPreHTLCAddr,
                    solver.toSolverAddr
                )
            );
    }

    modifier onlyGovernor() {
        require(msg.sender == governor, "No Allowance");
        _;
    }
}
