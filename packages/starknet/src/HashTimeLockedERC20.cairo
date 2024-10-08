//                                                   __     _____
//| |    __ _ _   _  ___ _ __ _____      ____ _ _ __ \ \   / ( _ )
//| |   / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \ \ \ / // _ \
//| |__| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | \ V /| (_) |
//|_____\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/   \_/  \___/
//            |___/                            |_|

use starknet::ContractAddress;
// #[starknet::interface]
// pub trait IMessenger<TContractState> {
//     fn notify(
//         ref self: TContractState,
//         commitId: u256,
//         hashlock: u256,
//         dstChain: felt252,
//         dstAsset: felt252,
//         dstAddress: felt252,
//         srcAsset: felt252,
//         sender: ContractAddress,
//         srcReceiver: ContractAddress,
//         amount: u256,
//         timelock: u256,
//         tokenContract: ContractAddress,
//     );
// }

#[starknet::interface]
pub trait IHashedTimelockERC20<TContractState> {
    fn commit_hop(
        ref self: TContractState,
        amount: u256,
        hopChains: Span<felt252>,
        hopAssets: Span<felt252>,
        hopAddress: Span<felt252>,
        dstChain: felt252,
        dstAsset: felt252,
        dstAddress: felt252,
        srcAsset: felt252,
        srcReceiver: ContractAddress,
        timelock: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
    ) -> u256;
    fn commit(
        ref self: TContractState,
        amount: u256,
        dstChain: felt252,
        dstAsset: felt252,
        dstAddress: felt252,
        srcAsset: felt252,
        srcReceiver: ContractAddress,
        timelock: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
    ) -> u256;
    fn lock(
        ref self: TContractState,
        amount: u256,
        hashlock: u256,
        timelock: u256,
        srcReceiver: ContractAddress,
        srcAsset: felt252,
        dstChain: felt252,
        dstAddress: felt252,
        dstAsset: felt252,
        commitId: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
    ) -> u256;
    fn redeem(ref self: TContractState, lockId: u256, secret: u256) -> bool;
    fn uncommit(ref self: TContractState, commitId: u256) -> bool;
    fn unlock(ref self: TContractState, lockId: u256) -> bool;
    fn lockCommit(ref self: TContractState, commitId: u256, hashlock: u256, timelock: u256) -> u256;
    fn getCommitDetails(self: @TContractState, commitId: u256) -> HashedTimelockERC20::PHTLC;
    fn getLockDetails(self: @TContractState, lockId: u256) -> HashedTimelockERC20::HTLC;
    fn getCommits(self: @TContractState, sender: ContractAddress) -> Span<u256>;
    // fn getLocks(self: @TContractState, sender: ContractAddress) -> Span<u256>;
    fn getLockIdByCommitId(self: @TContractState, commitId: u256) -> u256;
}

/// @title Pre Hashed Timelock Contracts (PHTLCs) on Starknet ERC20 tokens.
///
/// This contract provides a way to lock and keep PHTLCs for ERC20 tokens.
///
/// Protocol:
///
///  1) lock(srcReceiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to lock a new HTLC on a given token (tokenContract)
///       for a given amount. A uint256 lockId is returned
///  2) redeem(lockId, secret) - once the srcReceiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  3) unlock(lockId) - after timelock has expired and if the srcReceiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.
#[starknet::contract]
mod HashedTimelockERC20 {
    use core::traits::Into;
    use core::num::traits::Zero;
    use starknet::ContractAddress;
    use starknet::storage::{Map, StoragePathEntry};
    use starknet::{get_caller_address, get_contract_address, get_block_timestamp, get_block_info};
    //TODO: Check if this should be IERC20SafeDispatcher
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use alexandria_bytes::{Bytes, BytesTrait};
    // use super::{IMessengerDispatcher, IMessengerDispatcherTrait};

    #[storage]
    struct Storage {
        commitCounter: u256,
        // lockCounter: u256,
        block_number: u256,
        locks: Map::<u256, HTLC>,
        commits: Map::<u256, PHTLC>,
        commitIds: Map::<u256, u256>,
        // lockIds: Map::<u256, u256>,
        commitIdToLockId: Map::<u256, u256>,
    }

    //TDOO: check if this should be public or Not?
    #[derive(Drop, Serde, starknet::Store)]
    pub struct HTLC {
        dstAddress: felt252,
        dstChain: felt252,
        dstAsset: felt252,
        srcAsset: felt252,
        sender: ContractAddress,
        srcReceiver: ContractAddress,
        hashlock: u256,
        secret: u256,
        amount: u256,
        timelock: u256,
        tokenContract: ContractAddress,
        redeemed: bool,
        unlocked: bool,
    }
    #[derive(Drop, Serde, starknet::Store)]
    pub struct PHTLC {
        dstAddress: felt252,
        dstChain: felt252,
        dstAsset: felt252,
        srcAsset: felt252,
        sender: ContractAddress,
        srcReceiver: ContractAddress,
        lockId: u256,
        amount: u256,
        timelock: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
        locked: bool,
        uncommitted: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokenCommitted: TokenCommitted,
        TokenLocked: TokenLocked,
        TokenRedeemed: TokenRedeemed,
        TokenUnlocked: TokenUnlocked,
        TokenUncommitted: TokenUncommitted,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenCommitted {
        commitId: u256,
        hopChains: Span<felt252>,
        hopAssets: Span<felt252>,
        hopAddress: Span<felt252>,
        dstChain: felt252,
        dstAddress: felt252,
        dstAsset: felt252,
        #[key]
        sender: ContractAddress,
        #[key]
        srcReceiver: ContractAddress,
        srcAsset: felt252,
        amount: u256,
        timelock: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenLocked {
        #[key]
        hashlock: u256,
        dstChain: felt252,
        dstAddress: felt252,
        dstAsset: felt252,
        #[key]
        sender: ContractAddress,
        #[key]
        srcReceiver: ContractAddress,
        srcAsset: felt252,
        amount: u256,
        timelock: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
        commitId: u256,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenRedeemed {
        #[key]
        lockId: u256,
        redeemAddress: ContractAddress,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenUnlocked {
        #[key]
        lockId: u256
    }
    #[derive(Drop, starknet::Event)]
    struct TokenUncommitted {
        #[key]
        commitId: u256
    }
    #[constructor]
    fn constructor(ref self: ContractState) {
        self.commitCounter.write(0);
        // self.lockCounter.write(0);
        let block_info = get_block_info().unbox();
        let cur_block = block_info.block_number;
        self.block_number.write(cur_block.try_into().unwrap());
    }
    #[abi(embed_v0)]
    impl HashedTimelockERC20 of super::IHashedTimelockERC20<ContractState> {
        /// @dev Sender / Payer sets up a new pre-hash time lock contract depositing the
        /// funds and providing the reciever/srcReceiver and terms.
        /// @param srcReceiver reciever/srcReceiver of the funds.
        /// @param timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return Id of the new PHTLC. This is needed for subsequent calls.
        fn commit_hop(
            ref self: ContractState,
            amount: u256,
            hopChains: Span<felt252>,
            hopAssets: Span<felt252>,
            hopAddress: Span<felt252>,
            dstChain: felt252,
            dstAsset: felt252,
            dstAddress: felt252,
            srcAsset: felt252,
            srcReceiver: ContractAddress,
            timelock: u256,
            messenger: ContractAddress,
            tokenContract: ContractAddress,
        ) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(amount != 0, "Funds Can Not Be Zero");

            let block_number = self.block_number.read();
            let curId = self.commitCounter.read() + 1;
            self.commitCounter.write(curId);
            let commitId = block_number ^ curId;
            self.commitIds.write(curId, commitId);

            assert!(!self.hasCommitId(commitId), "Commitment Already Exists");

            let token: IERC20Dispatcher = IERC20Dispatcher { contract_address: tokenContract };
            assert!(token.balance_of(get_caller_address()) >= amount, "Insufficient Balance");
            assert!(
                token.allowance(get_caller_address(), get_contract_address()) >= amount,
                "Not Enough Allowence"
            );

            token.transfer_from(get_caller_address(), get_contract_address(), amount);

            self
                .commits
                .write(
                    commitId,
                    PHTLC {
                        dstAddress: dstAddress,
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        lockId: 0,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                        locked: false,
                        uncommitted: false,
                    }
                );
            self
                .emit(
                    TokenCommitted {
                        commitId: commitId,
                        hopChains: hopChains,
                        hopAssets: hopAssets,
                        hopAddress: hopAddress,
                        dstChain: dstChain,
                        dstAddress: dstAddress,
                        dstAsset: dstAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        srcAsset: srcAsset,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                    }
                );
            commitId
        }

        fn commit(
            ref self: ContractState,
            amount: u256,
            dstChain: felt252,
            dstAsset: felt252,
            dstAddress: felt252,
            srcAsset: felt252,
            srcReceiver: ContractAddress,
            timelock: u256,
            messenger: ContractAddress,
            tokenContract: ContractAddress,
        ) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(amount != 0, "Funds Can Not Be Zero");

            let block_number = self.block_number.read();
            let curId = self.commitCounter.read() + 1;
            self.commitCounter.write(curId);
            let commitId = block_number ^ curId;
            self.commitIds.write(curId, commitId);

            assert!(!self.hasCommitId(commitId), "Commitment Already Exists");

            let token: IERC20Dispatcher = IERC20Dispatcher { contract_address: tokenContract };
            assert!(token.balance_of(get_caller_address()) >= amount, "Insufficient Balance");
            assert!(
                token.allowance(get_caller_address(), get_contract_address()) >= amount,
                "No Enough Allowence"
            );

            token.transfer_from(get_caller_address(), get_contract_address(), amount);
            let hop_chains = array!['null'].span();
            let hop_assets = array!['null'].span();
            let hop_addresses = array!['null'].span();
            self
                .commits
                .write(
                    commitId,
                    PHTLC {
                        dstAddress: dstAddress,
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        lockId: 0,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                        locked: false,
                        uncommitted: false,
                    }
                );
            self
                .emit(
                    TokenCommitted {
                        commitId: commitId,
                        hopChains: hop_chains,
                        hopAssets: hop_assets,
                        hopAddress: hop_addresses,
                        dstChain: dstChain,
                        dstAddress: dstAddress,
                        dstAsset: dstAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        srcAsset: srcAsset,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                    }
                );
            commitId
        }

        /// @dev Sender / Payer sets up a new hash time lock contract depositing the
        /// funds and providing the reciever and terms.
        /// @param srcReceiver srcReceiver of the funds.
        /// @param hashlock A sha-256 hash hashlock.
        /// @param timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return Id of the new HTLC. This is needed for subsequent calls.
        fn lock(
            ref self: ContractState,
            amount: u256,
            hashlock: u256,
            timelock: u256,
            srcReceiver: ContractAddress,
            srcAsset: felt252,
            dstChain: felt252,
            dstAddress: felt252,
            dstAsset: felt252,
            commitId: u256,
            messenger: ContractAddress,
            tokenContract: ContractAddress,
        ) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(amount != 0, "Funds Can Not Be Zero");

            let lockId = hashlock;
            assert!(!self.hasLockId(lockId), "HTLC Already Exists");

            let token: IERC20Dispatcher = IERC20Dispatcher { contract_address: tokenContract };
            assert!(token.balance_of(get_caller_address()) >= amount, "Insufficient Balance");
            assert!(
                token.allowance(get_caller_address(), get_contract_address()) >= amount,
                "Not Enough Allowence"
            );

            token.transfer_from(get_caller_address(), get_contract_address(), amount);
            self
                .locks
                .write(
                    lockId,
                    HTLC {
                        dstAddress: dstAddress,
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        hashlock: hashlock,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        tokenContract: tokenContract,
                        redeemed: false,
                        unlocked: false
                    }
                );
            self
                .emit(
                    TokenLocked {
                        hashlock: hashlock,
                        dstChain: dstChain,
                        dstAddress: dstAddress,
                        dstAsset: dstAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        srcAsset: srcAsset,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                        commitId: commitId,
                    }
                );
            // if !messenger.is_zero() {
            //     let messenger: IMessengerDispatcher = IMessengerDispatcher {
            //         contract_address: messenger
            //     };
            //     messenger
            //         .notify(
            //             commitId,
            //             hashlock,
            //             dstChain,
            //             dstAsset,
            //             dstAddress,
            //             srcAsset,
            //             get_caller_address(),
            //             srcReceiver,
            //             amount,
            //             timelock,
            //             tokenContract,
            //         );
            // }
            // let curId = self.lockCounter.read() + 1;
            // self.lockCounter.write(curId);
            // self.lockIds.write(curId, lockId);

            self.commitIdToLockId.write(commitId, lockId);

            lockId
        }

        /// @dev Called by the srcReceiver once they know the secret of the hashlock.
        /// This will transfer the locked funds to their address.
        ///
        /// @param lockId of the HTLC.
        /// @param secret sha256(secret) should equal the contract hashlock.
        /// @return bool true on success
        fn redeem(ref self: ContractState, lockId: u256, secret: u256) -> bool {
            assert!(self.hasLockId(lockId), "Lock Id Does Not Exist");
            let htlc: HTLC = self.locks.read(lockId);

            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_u256(secret);
            let hash = bytes.sha256();
            assert!(htlc.hashlock == hash, "Does Not Match the Hashlock");
            assert!(!htlc.redeemed, "Funds Are Alredy Redeemed");
            assert!(!htlc.unlocked, "Funds Are Alredy Unlocked");

            self.locks.entry(lockId).secret.write(secret);
            self.locks.entry(lockId).redeemed.write(true);
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.srcReceiver, htlc.amount);
            self.emit(TokenRedeemed { lockId: lockId, redeemAddress: get_caller_address() });
            true
        }

        /// @dev Called by the sender if there was no redeem OR lockCommit AND the time lock has
        /// expired. This will unlock the contract amount.
        ///
        /// @param commitId of the PHTLC to unlock from.
        /// @return bool true on success
        fn uncommit(ref self: ContractState, commitId: u256) -> bool {
            assert!(self.hasCommitId(commitId), "Commitment Id Does Not Exist");
            let phtlc: PHTLC = self.commits.read(commitId);

            assert!(!phtlc.uncommitted, "Funds Are Already Uncommitted");
            assert!(!phtlc.locked, "Funds Are Already Locked");
            assert!(phtlc.timelock <= get_block_timestamp().into(), "Not Passed Time Lock");

            self.commits.entry(commitId).uncommitted.write(true);
            IERC20Dispatcher { contract_address: phtlc.tokenContract }
                .transfer(phtlc.sender, phtlc.amount);
            self.emit(TokenUncommitted { commitId: commitId });
            true
        }

        /// @dev Called by the sender if there was no redeem AND the time lock has
        /// expired. This will unlock the contract amount.
        ///
        /// @param lockId of the HTLC to unlock from.
        /// @return bool true on success
        fn unlock(ref self: ContractState, lockId: u256) -> bool {
            assert!(self.hasLockId(lockId), "Lock Id Does Not Exist");
            let htlc: HTLC = self.locks.read(lockId);

            assert!(!htlc.redeemed, "Funds Are Already Redeemed");
            assert!(!htlc.unlocked, "Funds Are Already Unlocked");
            assert!(htlc.timelock <= get_block_timestamp().into(), "Not Passed Time Lock");

            self.locks.entry(lockId).unlocked.write(true);
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.sender, htlc.amount);
            self.emit(TokenUnlocked { lockId: lockId });
            true
        }

        /// @dev Called by the sender to lockCommit the PHTLC to HTLC
        /// expired. This will unlock the contract amount.
        ///
        /// @param commitId of the PHTLC to lockCommit.
        /// @param hashlock of the HTLC to be locked.
        /// @return lockId of the locked HTLC
        fn lockCommit(
            ref self: ContractState, commitId: u256, hashlock: u256, timelock: u256
        ) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(self.hasCommitId(commitId), "Commitment Id Does Not Exist");
            let lockId = hashlock;
            let phtlc: PHTLC = self.commits.read(commitId);

            assert!(!phtlc.uncommitted, "Can't Lock Uncommitted Funds");
            assert!(!phtlc.locked, "Funds Are Already Locked");
            assert!(!self.hasLockId(lockId), "Lock Id Already Exist");
            assert!(
                get_caller_address() == phtlc.sender || get_caller_address() == phtlc.messenger,
                "Not The Messenger"
            );

            self.commits.entry(commitId).lockId.write(hashlock);
            self.commits.entry(commitId).locked.write(true);
            self
                .locks
                .write(
                    lockId,
                    HTLC {
                        dstAddress: phtlc.dstAddress,
                        dstChain: phtlc.dstChain,
                        dstAsset: phtlc.dstAsset,
                        srcAsset: phtlc.srcAsset,
                        sender: phtlc.sender,
                        srcReceiver: phtlc.srcReceiver,
                        hashlock: hashlock,
                        secret: 0,
                        amount: phtlc.amount,
                        timelock: timelock,
                        tokenContract: phtlc.tokenContract,
                        redeemed: false,
                        unlocked: false
                    }
                );
            self
                .emit(
                    TokenLocked {
                        hashlock: hashlock,
                        dstAddress: phtlc.dstAddress,
                        dstChain: phtlc.dstChain,
                        dstAsset: phtlc.dstAsset,
                        sender: phtlc.sender,
                        srcReceiver: phtlc.srcReceiver,
                        srcAsset: phtlc.srcAsset,
                        amount: phtlc.amount,
                        timelock: timelock,
                        messenger: phtlc.messenger,
                        tokenContract: phtlc.tokenContract,
                        commitId: commitId,
                    }
                );
            // let curId = self.lockCounter.read() + 1;
            // self.lockCounter.write(curId);
            // self.lockIds.write(curId, lockId);
            lockId
        }

        fn getLockDetails(self: @ContractState, lockId: u256) -> HTLC {
            if !self.hasLockId(lockId) {
                return HTLC {
                    dstAddress: 0,
                    dstChain: 0,
                    dstAsset: 0,
                    srcAsset: 0,
                    sender: Zero::zero(),
                    srcReceiver: Zero::zero(),
                    hashlock: 0,
                    secret: 0,
                    amount: 0,
                    timelock: 0,
                    tokenContract: Zero::zero(),
                    redeemed: false,
                    unlocked: false
                };
            }
            self.locks.read(lockId)
        }
        fn getCommitDetails(self: @ContractState, commitId: u256) -> PHTLC {
            if !self.hasCommitId(commitId) {
                return PHTLC {
                    dstAddress: 0,
                    dstChain: 0,
                    dstAsset: 0,
                    srcAsset: 0,
                    sender: Zero::zero(),
                    srcReceiver: Zero::zero(),
                    lockId: 0,
                    amount: 0,
                    timelock: 0,
                    messenger: Zero::zero(),
                    tokenContract: Zero::zero(),
                    locked: false,
                    uncommitted: false,
                };
            }
            self.commits.read(commitId)
        }
        fn getCommits(self: @ContractState, sender: ContractAddress) -> Span<u256> {
            let mut arr: Array<u256> = Default::default();
            let mut i: u256 = 1;
            while i <= self.commitCounter.read() {
                let commitId = self.commitIds.read(i);
                if self.commits.entry(commitId).sender.read() == sender {
                    arr.append(commitId);
                }
                i += 1;
            };
            arr.span()
        }
        // fn getLocks(self: @ContractState, sender: ContractAddress) -> Span<u256> {
        //     let mut arr: Array<u256> = Default::default();
        //     let mut i: u256 = 1;
        //     while i <= self.lockCounter.read() {
        //         let lockId = self.lockIds.read(i);
        //         if self.locks.entry(lockId).sender.read() == sender {
        //             arr.append(lockId);
        //         }
        //         i += 1;
        //     };
        //     arr.span()
        // }
        fn getLockIdByCommitId(self: @ContractState, commitId: u256) -> u256 {
            self.commitIdToLockId.read(commitId)
        }
    }

    #[generate_trait]
    //TODO: Check if this functions be inline?
    impl InternalFunctions of InternalFunctionsTrait {
        /// @dev Check if there is a PHTLC with the given Id.
        /// @param lockId into HTLC mapping.
        fn hasCommitId(self: @ContractState, commitId: u256) -> bool {
            let exists: bool = (!self.commits.read(commitId).sender.is_zero());
            exists
        }

        /// @dev Check if there is a HTLC with the given Id.
        /// @param lockId into HTLC mapping.
        fn hasLockId(self: @ContractState, lockId: u256) -> bool {
            let exists: bool = (!self.locks.read(lockId).sender.is_zero());
            exists
        }
    }
}
