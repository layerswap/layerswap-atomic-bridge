//                                                   __     _____
//| |    __ _ _   _  ___ _ __ _____      ____ _ _ __ \ \   / ( _ )
//| |   / _` | | | |/ _ \ '__/ __\ \ /\ / / _` | '_ \ \ \ / // _ \
//| |__| (_| | |_| |  __/ |  \__ \\ V  V / (_| | |_) | \ V /| (_) |
//|_____\__,_|\__, |\___|_|  |___/ \_/\_/ \__,_| .__/   \_/  \___/
//            |___/                            |_|

use starknet::ContractAddress;
#[starknet::interface]
pub trait IHashedTimelockERC20<TContractState> {
    fn commit_hop(
        ref self: TContractState,
        amount: u256,
        sender_key: felt252,
        hopChains: Span<felt252>,
        hopAssets: Span<felt252>,
        hopAddress: Span<felt252>,
        dstChain: felt252,
        dstAsset: felt252,
        dstAddress: ByteArray,
        srcAsset: felt252,
        srcReceiver: ContractAddress,
        timelock: u256,
        tokenContract: ContractAddress,
    ) -> u256;
    fn commit(
        ref self: TContractState,
        amount: u256,
        sender_key: felt252,
        dstChain: felt252,
        dstAsset: felt252,
        dstAddress: ByteArray,
        srcAsset: felt252,
        srcReceiver: ContractAddress,
        timelock: u256,
        tokenContract: ContractAddress,
    ) -> u256;
    fn lock(
        ref self: TContractState,
        Id: u256,
        amount: u256,
        hashlock: u256,
        timelock: u256,
        srcReceiver: ContractAddress,
        srcAsset: felt252,
        dstChain: felt252,
        dstAddress: ByteArray,
        dstAsset: felt252,
        tokenContract: ContractAddress,
    ) -> u256;
    fn redeem(ref self: TContractState, Id: u256, secret: u256) -> bool;
    fn refund(ref self: TContractState, Id: u256) -> bool;
    fn addLock(ref self: TContractState, Id: u256, hashlock: u256, timelock: u256) -> u256;
    fn addLockSig(
        ref self: TContractState,
        Id: u256,
        hashlock: u256,
        timelock: u256,
        r: felt252,
        s: felt252,
        y_parity: bool,
    ) -> u256;
    fn getDetails(self: @TContractState, Id: u256) -> HashedTimelockERC20::HTLC;
    fn getCommits(self: @TContractState, sender: ContractAddress) -> Span<u256>;
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
///  3) refund(Id) - after timelock has expired and if the srcReceiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.
#[starknet::contract]
mod HashedTimelockERC20 {
    use core::pedersen::PedersenTrait;
    use core::hash::{HashStateTrait, HashStateExTrait};
    use core::traits::Into;
    use core::num::traits::Zero;
    use core::ecdsa::{check_ecdsa_signature, recover_public_key};
    use starknet::storage::{Map, StoragePathEntry};
    use starknet::{
        ContractAddress, get_caller_address, get_contract_address, get_block_timestamp,
        get_block_info
    };
    //TODO: Check if this should be IERC20SafeDispatcher
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};
    use alexandria_bytes::{Bytes, BytesTrait};

    const STARKNET_DOMAIN_TYPE_HASH: felt252 =
        selector!("StarkNetDomain(name:felt,chainId:felt,version:felt)");
    const MESSAGE_TYPE_HASH: felt252 =
        selector!("Message(Id:u256,hashlock:u256,timelock:u256)u256(low:felt,high:felt)");
    const U256_TYPE_HASH: felt252 = selector!("u256(low:felt,high:felt)");
    #[storage]
    struct Storage {
        commitCounter: u256,
        block_number: u256,
        contracts: Map::<u256, HTLC>,
        commitIds: Map::<u256, u256>,
    }

    //TODO: check if this should be public or Not?
    #[derive(Drop, Serde, starknet::Store)]
    pub struct HTLC {
        dstAddress: ByteArray,
        dstChain: felt252,
        dstAsset: felt252,
        srcAsset: felt252,
        sender: ContractAddress,
        sender_key: felt252,
        srcReceiver: ContractAddress,
        hashlock: u256,
        secret: u256,
        amount: u256,
        timelock: u256,
        tokenContract: ContractAddress,
        redeemed: bool,
        refunded: bool,
    }

    #[derive(Drop, Copy, Hash)]
    struct Message {
        Id: u256,
        hashlock: u256,
        timelock: u256,
    }

    #[derive(Drop, Copy, Hash)]
    struct StarknetDomain {
        name: felt252,
        chain_id: felt252,
        version: felt252,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokenCommitted: TokenCommitted,
        TokenLocked: TokenLocked,
        TokenRedeemed: TokenRedeemed,
        TokenRefunded: TokenRefunded,
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
        tokenContract: ContractAddress,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenLocked {
        #[key]
        Id: u256,
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
        tokenContract: ContractAddress,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenRedeemed {
        #[key]
        Id: u256,
        redeemAddress: ContractAddress,
        secret: u256,
        hashlock: u256
    }
    #[derive(Drop, starknet::Event)]
    struct TokenRefunded {
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
        /// @param srcReceiver reciever of the funds.
        /// @param timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return Id of the new HTLC. This is needed for subsequent calls.
        fn commit_hop(
            ref self: ContractState,
            amount: u256,
            sender_key: felt252,
            hopChains: Span<felt252>,
            hopAssets: Span<felt252>,
            hopAddress: Span<felt252>,
            dstChain: felt252,
            dstAsset: felt252,
            dstAddress: ByteArray,
            srcAsset: felt252,
            srcReceiver: ContractAddress,
            timelock: u256,
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
                        sender_key: sender_key,
                        srcReceiver: srcReceiver,
                        hashlock: 0,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        tokenContract: tokenContract,
                        redeemed: false,
                        refunded: false,
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
                        tokenContract: tokenContract,
                    }
                );
            Id
        }

        fn commit(
            ref self: ContractState,
            amount: u256,
            sender_key: felt252,
            dstChain: felt252,
            dstAsset: felt252,
            dstAddress: ByteArray,
            srcAsset: felt252,
            srcReceiver: ContractAddress,
            timelock: u256,
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
                        sender_key: sender_key,
                        srcReceiver: srcReceiver,
                        hashlock: 0,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        tokenContract: tokenContract,
                        redeemed: false,
                        refunded: false,
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
                        tokenContract: tokenContract,
                    }
                );
            Id
        }

        /// @dev Sender / Payer sets up a new hash time lock contract depositing the
        /// funds and providing the reciever and terms.
        /// @param srcReceiver receiver of the funds.
        /// @param hashlock A sha-256 hash hashlock.
        /// @param timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return Id of the new HTLC. This is needed for subsequent calls.
        fn lock(
            ref self: ContractState,
            Id: u256,
            amount: u256,
            hashlock: u256,
            timelock: u256,
            srcReceiver: ContractAddress,
            srcAsset: felt252,
            dstChain: felt252,
            dstAddress: ByteArray,
            dstAsset: felt252,
            tokenContract: ContractAddress,
        ) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(amount != 0, "Funds Can Not Be Zero");
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
                        sender_key: '0', //as this won't be used
                        srcReceiver: srcReceiver,
                        hashlock: hashlock,
                        secret: 0,
                        amount: amount,
                        timelock: timelock,
                        tokenContract: tokenContract,
                        redeemed: false,
                        refunded: false
                    }
                );
            self
                .emit(
                    TokenLocked {
                        Id: Id,
                        hashlock: hashlock,
                        dstChain: dstChain,
                        dstAddress: dstAddress,
                        dstAsset: dstAsset,
                        sender: get_caller_address(),
                        srcReceiver: srcReceiver,
                        srcAsset: srcAsset,
                        amount: amount,
                        timelock: timelock,
                        tokenContract: tokenContract,
                    }
                );
            // let curId = self.lockCounter.read() + 1;
            // self.lockCounter.write(curId);
            // self.lockIds.write(curId, Id);
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
            assert!(!htlc.redeemed, "Funds Are Alredy Redeemed");
            assert!(!htlc.refunded, "Funds Are Alredy Refunded");
            assert!(htlc.hashlock == hash, "Does Not Match the Hashlock");

            self.contracts.entry(Id).secret.write(secret);
            self.contracts.entry(Id).redeemed.write(true);
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.srcReceiver, htlc.amount);
            self
                .emit(
                    TokenRedeemed {
                        Id: Id,
                        redeemAddress: get_caller_address(),
                        secret: secret,
                        hashlock: htlc.hashlock
                    }
                );
            true
        }

        /// @dev Called by the sender if there was no redeem AND the timelock has
        /// expired. This will refund the contract amount.
        ///
        /// @param Id of the HTLC to refund from.
        /// @return bool true on success
        fn refund(ref self: ContractState, Id: u256) -> bool {
            assert!(self.hasHTLC(Id), "HTLC Does Not Exist");
            let htlc: HTLC = self.contracts.read(Id);

            assert!(!htlc.redeemed, "Funds Are Already Redeemed");
            assert!(!htlc.refunded, "Funds Are Already Refunded");
            assert!(htlc.timelock <= get_block_timestamp().into(), "Not Passed Timelock");

            self.contracts.entry(Id).refunded.write(true);
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.sender, htlc.amount);
            self.emit(TokenRefunded { Id: Id });
            true
        }

        /// @dev Called by the sender to add hashlock to the HTLC
        ///
        /// @param Id of the HTLC.
        /// @param hashlock to be added.
        /// @return Id of the locked HTLC
        fn addLock(ref self: ContractState, Id: u256, hashlock: u256, timelock: u256) -> u256 {
            assert!(timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(self.hasHTLC(Id), "HTLC Does Not Exist");
            let htlc: HTLC = self.contracts.read(Id);

            assert!(!htlc.refunded, "Funds Are Already Refunded");
            assert!(!htlc.redeemed, "Funds Are Already Redeemed");
            assert!(htlc.hashlock == 0, "Hashlock Already Set");
            assert!(
                get_caller_address() == htlc.sender
                    || get_caller_address() == get_contract_address(),
                "Unauthorized Access"
            );

            self.contracts.entry(Id).hashlock.write(hashlock);
            self.contracts.entry(Id).timelock.write(timelock);
            self
                .emit(
                    TokenLocked {
                        Id: Id,
                        hashlock: hashlock,
                        dstChain: htlc.dstChain,
                        dstAddress: htlc.dstAddress,
                        dstAsset: htlc.dstAsset,
                        sender: get_caller_address(),
                        srcReceiver: htlc.srcReceiver,
                        srcAsset: htlc.srcAsset,
                        amount: htlc.amount,
                        timelock: timelock,
                        tokenContract: htlc.tokenContract,
                    }
                );
            Id
        }
        fn addLockSig(
            ref self: ContractState,
            Id: u256,
            hashlock: u256,
            timelock: u256,
            r: felt252,
            s: felt252,
            y_parity: bool,
        ) -> u256 {
            let sender_key = self.contracts.read(Id).sender_key;
            let message = Message { Id: Id, hashlock: hashlock, timelock: timelock };
            let message_hash: felt252 = self.get_message_hash(message, sender_key);
            assert!(check_ecdsa_signature(message_hash, sender_key, r, s), "Invalid Signature");

            if let Option::Some(recovered_key) = recover_public_key(message_hash, r, s, y_parity) {
                assert!(recovered_key == sender_key, "Signed With Unknown Key");
            } else {
                //TODO: should this be here? As the ecdsa_signature check is already done
                assert!(false, "Couldn't Recover The Public Key")
            }
            self.addLock(Id, hashlock, timelock)
        }

        /// @dev Returns the data of the HTLC with the given Id.
        /// will return the default values if HTLC with the given Id does not exist.
        fn getDetails(self: @ContractState, Id: u256) -> HTLC {
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
        /// @dev Gets the StarkNet hash of the given message with the given public key.
        /// @param message to be hashed.
        /// @param sender_key to hash with.
        fn get_message_hash(
            self: @ContractState, message: Message, sender_key: felt252
        ) -> felt252 {
            let domain = StarknetDomain { name: 'LayerswapV8', chain_id: 'StarkNet', version: 1 };
            //initialize the Pederson Hash with 0
            let mut state = PedersenTrait::new(0);
            //update with StarkNet Message
            state = state.update_with('StarkNet Message');
            //update with domain hash
            state = state.update_with(self.hash_domain(domain));
            //update with sender_key.
            state = state.update_with(sender_key);
            //update with message
            state = state.update_with(self.hash_message(message));
            // Hashing with the amount of elements being hashed
            state = state.update_with(4);
            state.finalize()
        }
        /// @dev Used to hash the given domain of StarknetDomain type.
        /// @param domain to hash.
        fn hash_domain(self: @ContractState, domain: StarknetDomain) -> felt252 {
            //initialize the Pederson Hash with 0
            let mut state = PedersenTrait::new(0);
            //update with domain type hash
            state = state.update_with(STARKNET_DOMAIN_TYPE_HASH);
            //update with the domain(name, chain_id, version)
            state = state.update_with(domain);
            //update with the amount of elements being hashed
            state = state.update_with(4);
            //finalize the Pederson Hash and return the hash value
            state.finalize()
        }
        /// @dev Used to hash the given message of Message type.
        /// @param message  hash.
        fn hash_message(self: @ContractState, message: Message) -> felt252 {
            //initialize the Pederson Hash with 0
            let mut state = PedersenTrait::new(0);
            //update with message type hash
            state = state.update_with(MESSAGE_TYPE_HASH);
            //update with the Id
            state = state.update_with(self.hash_u256(message.Id));
            //update with the hashlock
            state = state.update_with(self.hash_u256(message.hashlock));
            //update with the timelock
            state = state.update_with(self.hash_u256(message.timelock));
            //update with the amount of elements being hashed
            state = state.update_with(4);
            //finalize the Pederson Hash and return the hash value
            state.finalize()
        }
        /// @dev Used to hash the given u256 number.
        /// @param number to hash.
        fn hash_u256(self: @ContractState, number: u256) -> felt252 {
            //initialize the Pederson Hash with 0
            let mut state = PedersenTrait::new(0);
            //update with u256 type hash
            state = state.update_with(U256_TYPE_HASH);
            //update with the u256 number(low, high)
            state = state.update_with(number);
            //update with the amount of elements being hashed
            state = state.update_with(3);
            //finalize the Pederson Hash and return the hash value
            state.finalize()
        }
    }
}
