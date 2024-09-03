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
//         srcId: u256,
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
        dstAddress: ByteArray,
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
        dstAddress: ByteArray,
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
        dstAddress: ByteArray,
        dstAsset: felt252,
        srcId: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
    ) -> u256;
    fn redeem(ref self: TContractState, Id: u256, secret: u256) -> bool;
    fn unlock(ref self: TContractState, Id: u256) -> bool;
    fn lockCommit(ref self: TContractState, Id: u256, hashlock: u256, timelock: u256) -> u256;
    fn getDetails(self: @TContractState, Id: u256) -> HashedTimelockERC20::HTLC;
    fn getCommits(self: @TContractState, sender: ContractAddress) -> Span<u256>;
    fn getIdBySrcId(self: @TContractState, srcId: u256) -> u256;
}

/// @title Pre Hashed Timelock Contracts (PHTLCs) on Starknet ERC20 tokens.
///
/// This contract provides a way to lock and keep PHTLCs for ERC20 tokens.
///
/// Protocol:
///
///  1) lock(srcReceiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to lock a new HTLC on a given token (tokenContract)
///       for a given amount. A uint256 Id is returned
///  2) redeem(Id, secret) - once the srcReceiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  3) unlock(Id) - after timelock has expired and if the srcReceiver did not
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
        block_number: u256,
        contracts: Map::<u256, HTLC>,
        commitIds: Map::<u256, u256>,
        srcIdToId: Map::<u256, u256>,
    }

    //TODO: check if this should be public or Not?
    #[derive(Drop, Serde, starknet::Store)]
    pub struct HTLC {
        dstAddress: ByteArray,
        dstChain: felt252,
        dstAsset: felt252,
        srcAsset: felt252,
        sender: ContractAddress,
        srcReceiver: ContractAddress,
        hashlock: u256,
        secret: u256,
        amount: u256,
        timelock: u256,
        messenger: ContractAddress,
        tokenContract: ContractAddress,
        redeemed: bool,
        unlocked: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokenCommitted: TokenCommitted,
        TokenLocked: TokenLocked,
        TokenLockCommitted: TokenLockCommitted,
        TokenRedeemed: TokenRedeemed,
        TokenUnlocked: TokenUnlocked,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenCommitted {
        Id: u256,
        hopChains: Span<felt252>,
        hopAssets: Span<felt252>,
        hopAddress: Span<felt252>,
        dstChain: felt252,
        dstAddress: ByteArray,
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
        dstAddress: ByteArray,
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
        srcId: u256,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenLockCommitted {
        #[key]
        Id: u256,
        #[key]
        messenger: ContractAddress,
        hashlock: u256,
        timelock: u256,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenRedeemed {
        #[key]
        Id: u256,
        redeemAddress: ContractAddress,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenUnlocked {
        #[key]
        Id: u256
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        self.commitCounter.write(0);
        let block_info = get_block_info().unbox();
        let cur_block = block_info.block_number;
        self.block_number.write(cur_block.try_into().unwrap());
    }
    #[abi(embed_v0)]
    impl HashedTimelockERC20 of super::IHashedTimelockERC20<ContractState> {
        /// @dev Sender / Payer sets up a new pre-hash timelock contract depositing the
        /// funds and providing the reciever/srcReceiver and terms.
        /// @param srcReceiver reciever/srcReceiver of the funds.
        /// @param timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return Id of the new HTLC. This is needed for subsequent calls.
        fn commit_hop(
            ref self: ContractState,
            amount: u256,
            hopChains: Span<felt252>,
            hopAssets: Span<felt252>,
            hopAddress: Span<felt252>,
            dstChain: felt252,
            dstAsset: felt252,
            dstAddress: ByteArray,
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
            let Id = block_number ^ curId;
            self.commitIds.write(curId, Id);

            assert!(!self.hasHTLC(Id), "Commitment Already Exists");

            let token: IERC20Dispatcher = IERC20Dispatcher { contract_address: tokenContract };
            assert!(token.balance_of(get_caller_address()) >= amount, "Insufficient Balance");
            assert!(
                token.allowance(get_caller_address(), get_contract_address()) >= amount,
                "Not Enough Allowence"
            );

            token.transfer_from(get_caller_address(), get_contract_address(), amount);

            self
                .contracts
                .write(
                    Id,
                    HTLC {
                        dstAddress: dstAddress.clone(),
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        hashlock: 0,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                        redeemed: false,
                        unlocked: false,
                    }
                );
            self
                .emit(
                    TokenCommitted {
                        Id: Id,
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
            Id
        }

        fn commit(
            ref self: ContractState,
            amount: u256,
            dstChain: felt252,
            dstAsset: felt252,
            dstAddress: ByteArray,
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
            let Id = block_number ^ curId;
            self.commitIds.write(curId, Id);

            assert!(!self.hasHTLC(Id), "HTLC Already Exists");

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
                .contracts
                .write(
                    Id,
                    HTLC {
                        dstAddress: dstAddress.clone(),
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        hashlock: 0,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
                        tokenContract: tokenContract,
                        redeemed: false,
                        unlocked: false,
                    }
                );
            self
                .emit(
                    TokenCommitted {
                        Id: Id,
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
            Id
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
            dstAddress: ByteArray,
            dstAsset: felt252,
            srcId: u256,
            messenger: ContractAddress,
            tokenContract: ContractAddress,
        ) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(amount != 0, "Funds Can Not Be Zero");

            let Id = hashlock;
            assert!(!self.hasHTLC(Id), "HTLC Already Exists");

            let token: IERC20Dispatcher = IERC20Dispatcher { contract_address: tokenContract };
            assert!(token.balance_of(get_caller_address()) >= amount, "Insufficient Balance");
            assert!(
                token.allowance(get_caller_address(), get_contract_address()) >= amount,
                "Not Enough Allowence"
            );

            token.transfer_from(get_caller_address(), get_contract_address(), amount);
            self
                .contracts
                .write(
                    Id,
                    HTLC {
                        dstAddress: dstAddress.clone(),
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        hashlock: hashlock,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        messenger: messenger,
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
                        srcId: srcId,
                    }
                );
            // if !messenger.is_zero() {
            //     let messenger: IMessengerDispatcher = IMessengerDispatcher {
            //         contract_address: messenger
            //     };
            //     messenger
            //         .notify(
            //             srcId,
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
            // self.lockIds.write(curId, Id);
            if self.srcIdToId.entry(srcId).read() == 0 {
                self.srcIdToId.write(srcId, Id);
            }

            Id
        }

        /// @dev Called by the srcReceiver once they know the secret of the hashlock.
        /// This will transfer the locked funds to their address.
        ///
        /// @param Id of the HTLC.
        /// @param secret sha256(secret) should equal the contract hashlock.
        /// @return bool true on success
        fn redeem(ref self: ContractState, Id: u256, secret: u256) -> bool {
            assert!(self.hasHTLC(Id), "HTLC Does Not Exist");
            let htlc: HTLC = self.contracts.read(Id);

            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_u256(secret);
            let hash = bytes.sha256();
            assert!(htlc.hashlock != 0, "Hashlock Is Not Set");
            assert!(htlc.hashlock == hash, "Does Not Match the Hashlock");
            assert!(!htlc.redeemed, "Funds Are Alredy Redeemed");
            assert!(!htlc.unlocked, "Funds Are Alredy Unlocked");
            // self
            //     .contracts
            //     .write(
            //         Id,
            //         HTLC {
            //             dstAddress: htlc.dstAddress,
            //             dstChain: htlc.dstChain,
            //             dstAsset: htlc.dstAsset,
            //             srcAsset: htlc.srcAsset,
            //             sender: htlc.sender,
            //             srcReceiver: htlc.srcReceiver,
            //             hashlock: htlc.hashlock,
            //             secret: secret,
            //             amount: htlc.amount,
            //             timelock: htlc.timelock,
            //             tokenContract: htlc.tokenContract,
            //             redeemed: true,
            //             unlocked: htlc.unlocked
            //         }
            //     );
            self.contracts.entry(Id).secret.write(secret);
            self.contracts.entry(Id).redeemed.write(true);
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.srcReceiver, htlc.amount);
            self.emit(TokenRedeemed { Id: Id, redeemAddress: get_caller_address() });
            true
        }

        /// @dev Called by the sender if there was no redeem AND the timelock has
        /// expired. This will refund the contract amount.
        ///
        /// @param Id of the HTLC to unlock from.
        /// @return bool true on success
        fn unlock(ref self: ContractState, Id: u256) -> bool {
            assert!(self.hasHTLC(Id), "HTLC Does Not Exist");
            let htlc: HTLC = self.contracts.read(Id);

            assert!(!htlc.redeemed, "Funds Are Already Redeemed");
            assert!(!htlc.unlocked, "Funds Are Already Unlocked");
            assert!(htlc.timelock <= get_block_timestamp().into(), "Not Passed Timelock");

            // self
            //     .contracts
            //     .write(
            //         Id,
            //         HTLC {
            //             dstAddress: htlc.dstAddress,
            //             dstChain: htlc.dstChain,
            //             dstAsset: htlc.dstAsset,
            //             srcAsset: htlc.srcAsset,
            //             sender: htlc.sender,
            //             srcReceiver: htlc.srcReceiver,
            //             hashlock: htlc.hashlock,
            //             secret: htlc.secret,
            //             amount: htlc.amount,
            //             timelock: htlc.timelock,
            //             tokenContract: htlc.tokenContract,
            //             redeemed: htlc.redeemed,
            //             unlocked: true
            //         }
            //     );
            self.contracts.entry(Id).unlocked.write(true);
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.sender, htlc.amount);
            self.emit(TokenUnlocked { Id: Id });
            true
        }

        /// @dev Called by the sender to convert the PHTLC to HTLC
        ///
        /// @param Id of the PHTLC to convert.
        /// @param hashlock of the HTLC to be locked.
        /// @return Id of the locked HTLC
        fn lockCommit(ref self: ContractState, Id: u256, hashlock: u256, timelock: u256) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(self.hasHTLC(Id), "HTLC Does Not Exist");
            assert!(!self.hasHTLC(hashlock), "HTLC With This Hashlock Already Exists");
            let htlc: HTLC = self.contracts.read(Id);

            assert!(!htlc.unlocked, "Funds Are Already Unlocked");
            assert!(!htlc.redeemed, "Funds Are Already Redeemed");
            assert!(htlc.hashlock == 0, "Hashlock Already Set");
            assert!(
                get_caller_address() == htlc.sender || get_caller_address() == htlc.messenger,
                "Not The Messenger"
            );

            self.contracts.entry(Id).hashlock.write(hashlock);
            self.contracts.entry(Id).timelock.write(timelock);
            self
                .emit(
                    TokenLockCommitted {
                        Id: Id,
                        messenger: get_caller_address(),
                        hashlock: hashlock,
                        timelock: timelock,
                    }
                );
            // let curId = self.lockCounter.read() + 1;
            // self.lockCounter.write(curId);
            // self.lockIds.write(curId, Id);
            Id
        }

        fn getDetails(self: @ContractState, Id: u256) -> HTLC {
            // if !self.hasHTLC(Id) {
            //     return HTLC {
            //         dstAddress: "0",
            //         dstChain: 0,
            //         dstAsset: 0,
            //         srcAsset: 0,
            //         sender: Zero::zero(),
            //         srcReceiver: Zero::zero(),
            //         hashlock: 0,
            //         secret: 0,
            //         amount: 0,
            //         timelock: 0,
            //         messenger: Zero::zero(),
            //         tokenContract: Zero::zero(),
            //         redeemed: false,
            //         unlocked: false
            //     };
            // }
            self.contracts.read(Id)
        }
        fn getCommits(self: @ContractState, sender: ContractAddress) -> Span<u256> {
            let mut arr: Array<u256> = Default::default();
            let mut i: u256 = 1;
            while i <= self.commitCounter.read() {
                let Id = self.commitIds.read(i);
                if self.contracts.entry(Id).sender.read() == sender {
                    arr.append(Id);
                }
                i += 1;
            };
            arr.span()
        }
        fn getIdBySrcId(self: @ContractState, srcId: u256) -> u256 {
            self.srcIdToId.read(srcId)
        }
    }

    #[generate_trait]
    //TODO: Check if this function should be inline?
    impl InternalFunctions of InternalFunctionsTrait {
        /// @dev Check if there is a HTLC with the given Id.
        /// @param Id into HTLC mapping.
        fn hasHTLC(self: @ContractState, Id: u256) -> bool {
            let exists: bool = (!self.contracts.read(Id).sender.is_zero());
            exists
        }
    }
}
