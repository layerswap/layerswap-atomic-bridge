use starknet::ContractAddress;
#[starknet::interface]
pub trait IHashedTimelockERC20<TContractState> {
    fn create(
        ref self: TContractState,
        _receiver: ContractAddress,
        _hashlock: u256,
        _timelock: u256,
        _tokenContract: ContractAddress,
        _amount: u256,
        _chainId: u256,
        _targetCurrencyReceiverAddress: felt252
    ) -> u256;
    fn batchCreate(
        ref self: TContractState,
        _receivers: Span<ContractAddress>,
        _hashlocks: Span<u256>,
        _timelocks: Span<u256>,
        _tokenContracts: Span<ContractAddress>,
        _amounts: Span<u256>,
        _chainIds: Span<u256>,
        _targetCurrencyReceiverAddresses: Span<felt252>
    ) -> Span<u256>;
    fn redeem(ref self: TContractState, htlcId: u256, _secret: felt252) -> bool;
    fn batchRedeem(ref self: TContractState, htlcIds: Span<u256>, _secrets: Span<felt252>) -> bool;
    fn refund(ref self: TContractState, htlcId: u256) -> bool;
    fn getHTLCDetails(
        self: @TContractState, htlcId: u256
    ) -> (
        (ContractAddress, ContractAddress, ContractAddress),
        (u256, u256, u256),
        (bool, bool),
        felt252
    );
}

/// @title Hashed Timelock Contracts (HTLCs) on Starknet ERC20 tokens.
///
/// This contract provides a way to create and keep HTLCs for ERC20 tokens.
///
/// Protocol:
///
///  1) create(receiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to create a new HTLC on a given token (tokenContract)
///       for a given amount. A uint256 htlcId is returned
///  2) redeem(htlcId, secret) - once the receiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  3) refund(htlcId) - after timelock has expired and if the receiver did not
///      redeem the tokens the sender / creator of the HTLC can get their tokens
///      back with this function.
#[starknet::contract]
mod HashedTimelockERC20 {
    use core::clone::Clone;
    use core::array::ArrayTrait;
    use core::num::traits::Zero;
    use starknet::ContractAddress;
    use openzeppelin::token::erc20::interface::IERC20DispatcherTrait;
    use core::traits::Into;
    use starknet::get_caller_address;
    use starknet::get_contract_address;
    use starknet::get_block_timestamp;
    //TODO: Check if this should be IERC20SafeDispatcher 
    use openzeppelin::token::erc20::interface::IERC20Dispatcher;
    use alexandria_math::sha256::sha256;
    use alexandria_bytes::Bytes;
    use alexandria_bytes::BytesTrait;

    #[storage]
    struct Storage {
        htlc: HTLC,
        contracts: LegacyMap::<u256, HTLC>,
    }
    //TDOO: check if this should be public?
    #[derive(Drop, Serde, starknet::Store)]
    struct HTLC {
        hashlock: u256,
        secret: felt252,
        amount: u256,
        timelock: u256,
        sender: ContractAddress,
        receiver: ContractAddress,
        tokenContract: ContractAddress,
        redeemed: bool,
        refunded: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokenTransferInitiated: TokenTransferInitiated,
        TokenTransferClaimed: TokenTransferClaimed,
        TokenTransferRefunded: TokenTransferRefunded,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenTransferInitiated {
        #[key]
        hashlock: u256,
        amount: u256,
        chainId: u256,
        timelock: u256,
        #[key]
        sender: ContractAddress,
        #[key]
        receiver: ContractAddress,
        tokenContract: ContractAddress,
        targetCurrencyReceiverAddress: felt252,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenTransferClaimed {
        #[key]
        htlcId: u256
    }
    #[derive(Drop, starknet::Event)]
    struct TokenTransferRefunded {
        #[key]
        htlcId: u256
    }
    #[abi(embed_v0)]
    impl HashedTimelockERC20 of super::IHashedTimelockERC20<ContractState> {
        /// @dev Sender / Payer sets up a new hash time lock contract depositing the
        /// funds and providing the reciever and terms.
        /// @param _receiver Receiver of the funds.
        /// @param _hashlock A sha-256 hash hashlock.
        /// @param _timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return Id of the new HTLC. This is needed for subsequent
        ///                    calls.
        fn create(
            ref self: ContractState,
            _receiver: ContractAddress,
            _hashlock: u256,
            _timelock: u256,
            _tokenContract: ContractAddress,
            _amount: u256,
            _chainId: u256,
            _targetCurrencyReceiverAddress: felt252
        ) -> u256 {
            assert!(_timelock > get_block_timestamp().into(), "Not Future TimeLock");
            assert!(_amount != 0, "Funds Can Not Be Zero");

            let htlcId = _hashlock;
            assert!(!self.hasHTLC(htlcId), "HTLC Already Exists");

            let token: IERC20Dispatcher = IERC20Dispatcher { contract_address: _tokenContract };
            assert!(token.balance_of(get_caller_address()) >= _amount, "Insufficient Balance");
            assert!(
                token.allowance(get_caller_address(), get_contract_address()) >= _amount,
                "No Enough Allowence"
            );

            token.transfer_from(get_caller_address(), get_contract_address(), _amount);
            self
                .contracts
                .write(
                    htlcId,
                    HTLC {
                        hashlock: _hashlock,
                        secret: 0,
                        amount: _amount,
                        timelock: _timelock,
                        sender: get_caller_address(),
                        receiver: _receiver,
                        tokenContract: _tokenContract,
                        redeemed: false,
                        refunded: false
                    }
                );
            self
                .emit(
                    TokenTransferInitiated {
                        hashlock: _hashlock,
                        amount: _amount,
                        chainId: _chainId,
                        timelock: _timelock,
                        sender: get_caller_address(),
                        receiver: _receiver,
                        tokenContract: _tokenContract,
                        targetCurrencyReceiverAddress: _targetCurrencyReceiverAddress
                    }
                );
            htlcId
        }

        /// @notice Allows the batch creation of multiple Hashed Time-Lock Contracts (HTLCs).
        /// @dev This function is used to create multiple HTLCs simultaneously.
        /// @param _receivers An array containing receivers of the corresponding funds.
        /// @param _hashlocks An array containing the sha-256 hash hashlocks.
        /// @param _timelocks An array containing the UNIX epoch seconds time that the locks expire at.
        /// @return Ids of the new HTLCs.
        fn batchCreate(
            ref self: ContractState,
            _receivers: Span<ContractAddress>,
            _hashlocks: Span<u256>,
            _timelocks: Span<u256>,
            _tokenContracts: Span<ContractAddress>,
            _amounts: Span<u256>,
            _chainIds: Span<u256>,
            _targetCurrencyReceiverAddresses: Span<felt252>
        ) -> Span<u256> {
            assert!(
                _receivers.len() != 0
                    && _receivers.len() == _hashlocks.len()
                    && _receivers.len() == _timelocks.len()
                    && _receivers.len() == _chainIds.len()
                    && _receivers.len() == _targetCurrencyReceiverAddresses.len()
                    && _receivers.len() == _amounts.len()
                    && _receivers.len() == _tokenContracts.len(),
                "Incorrect Data"
            );
            let mut htlcIds: Span<u256> = _hashlocks.clone();
            let mut i: usize = 0;
            while i < _amounts
                .len() {
                    assert!(
                        *_timelocks[i] > get_block_timestamp().into(), "Not {i}-th Future TimeLock"
                    );
                    assert!(*_amounts[i] != 0, "{i}-th Funds Can Not Be Zero");
                    assert!(!self.hasHTLC(*htlcIds[i]), "{i}-th HTLC Already Exists");

                    let token: IERC20Dispatcher = IERC20Dispatcher {
                        contract_address: *_tokenContracts[i]
                    };
                    assert!(
                        token.balance_of(get_caller_address()) >= *_amounts[i],
                        "Insufficient {i}-th Balance"
                    );
                    assert!(
                        token
                            .allowance(
                                get_caller_address(), get_contract_address()
                            ) >= *_amounts[i],
                        "No Enough Allowence"
                    );

                    token.transfer_from(get_caller_address(), get_contract_address(), *_amounts[i]);
                    self
                        .contracts
                        .write(
                            *htlcIds[i],
                            HTLC {
                                hashlock: *_hashlocks[i],
                                secret: 0,
                                amount: *_amounts[i],
                                timelock: *_timelocks[i],
                                sender: get_caller_address(),
                                receiver: *_receivers[i],
                                tokenContract: *_tokenContracts[i],
                                redeemed: false,
                                refunded: false
                            }
                        );
                    self
                        .emit(
                            TokenTransferInitiated {
                                hashlock: *_hashlocks[i],
                                amount: *_amounts[i],
                                chainId: *_chainIds[i],
                                timelock: *_timelocks[i],
                                sender: get_caller_address(),
                                receiver: *_receivers[i],
                                tokenContract: *_tokenContracts[i],
                                targetCurrencyReceiverAddress: *_targetCurrencyReceiverAddresses[i]
                            }
                        );
                };
            htlcIds
        }

        /// @dev Called by the receiver once they know the secret of the hashlock.
        /// This will transfer the locked funds to their address.
        ///
        /// @param htlcId of the HTLC.
        /// @param _secret sha256(_secret) should equal the contract hashlock.
        /// @return bool true on success
        fn redeem(ref self: ContractState, htlcId: u256, _secret: felt252) -> bool {
            assert!(self.hasHTLC(htlcId), "HTLC Does Not Exist");
            let htlc: HTLC = self.contracts.read(htlcId);

            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_felt252(_secret);
            let pre = bytes.sha256();
            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_u256(pre);
            let hash_pre = bytes.sha256();
            assert!(htlc.hashlock == hash_pre, "Does Not Match the Hashlock");
            assert!(!htlc.redeemed, "Funds Are Alredy Redeemed");
            assert!(!htlc.refunded, "Funds Are Alredy Refunded");
            self
                .contracts
                .write(
                    htlcId,
                    HTLC {
                        hashlock: htlc.hashlock,
                        secret: _secret,
                        amount: htlc.amount,
                        timelock: htlc.timelock,
                        sender: htlc.sender,
                        receiver: htlc.receiver,
                        tokenContract: htlc.tokenContract,
                        redeemed: true,
                        refunded: htlc.refunded
                    }
                );
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.receiver, htlc.amount);
            self.emit(TokenTransferClaimed { htlcId: htlcId });
            true
        }

        /// @notice Allows the batch redemption of tokens locked in multiple Hashed Time-Lock Contracts (HTLCs).
        /// @dev This function is used to redeem tokens from multiple HTLCs simultaneously, providing the corresponding secrets for each HTLC.
        /// @param htlcIds An array containing the unique identifiers (IDs) of the HTLCs from which tokens are to be redeemed.
        /// @param _secrets An array containing the secret values corresponding to each HTLC in htlcIDs.
        /// @return A boolean indicating whether the batch redemption was successful.
        fn batchRedeem(
            ref self: ContractState, htlcIds: Span<u256>, _secrets: Span<felt252>
        ) -> bool {
            assert!(htlcIds.len() == _secrets.len(), "Incorrect Number Of Secrets");
            assert!(self.hasHTLCs(htlcIds), "HTLCs Do Not Exist");
            let mut i: usize = 0;
            while i < htlcIds
                .len() {
                    let htlc: HTLC = self.contracts.read(*htlcIds[i]);
                    let mut bytes: Bytes = BytesTrait::new(0, array![]);
                    bytes.append_felt252(*_secrets[i]);
                    let pre = bytes.sha256();
                    let mut bytes: Bytes = BytesTrait::new(0, array![]);
                    bytes.append_u256(pre);
                    let hash_pre = bytes.sha256();
                    assert!(htlc.hashlock == hash_pre, "Does Not Match the {i}-th Hashlock");
                    assert!(!htlc.redeemed, "{i}-th Funds Are Alredy Redeemed");
                    assert!(!htlc.refunded, "{i}-th Funds Are Alredy Refunded");
                    self
                        .contracts
                        .write(
                            *htlcIds[i],
                            HTLC {
                                hashlock: htlc.hashlock,
                                secret: *_secrets[i],
                                amount: htlc.amount,
                                timelock: htlc.timelock,
                                sender: htlc.sender,
                                receiver: htlc.receiver,
                                tokenContract: htlc.tokenContract,
                                redeemed: true,
                                refunded: htlc.refunded
                            }
                        );
                    IERC20Dispatcher { contract_address: htlc.tokenContract }
                        .transfer(htlc.receiver, htlc.amount);
                    self.emit(TokenTransferClaimed { htlcId: *htlcIds[i] });
                    i += 1;
                };
            true
        }

        /// @dev Called by the sender if there was no redeem AND the time lock has
        /// expired. This will refund the contract amount.
        ///
        /// @param _htlcId of the HTLC to refund from.
        /// @return bool true on success
        fn refund(ref self: ContractState, htlcId: u256) -> bool {
            assert!(self.hasHTLC(htlcId), "HTLC Does Not Exist");
            let htlc: HTLC = self.contracts.read(htlcId);

            assert!(!htlc.refunded, "Funds Are Already Refunded");
            assert!(!htlc.redeemed, "Funds Are Already Redeemed");
            assert!(htlc.timelock <= get_block_timestamp().into(), "Not Passed Time Lock");

            self
                .contracts
                .write(
                    htlcId,
                    HTLC {
                        hashlock: htlc.hashlock,
                        secret: htlc.secret,
                        amount: htlc.amount,
                        timelock: htlc.timelock,
                        sender: htlc.sender,
                        receiver: htlc.receiver,
                        tokenContract: htlc.tokenContract,
                        redeemed: htlc.redeemed,
                        refunded: true
                    }
                );
            IERC20Dispatcher { contract_address: htlc.tokenContract }
                .transfer(htlc.sender, htlc.amount);
            self.emit(TokenTransferRefunded { htlcId: htlcId });
            true
        }

        /// @dev Get HTLC details.
        /// @param htlcId of the HTLC.
        fn getHTLCDetails(
            self: @ContractState, htlcId: u256
        ) -> (
            (ContractAddress, ContractAddress, ContractAddress),
            (u256, u256, u256),
            (bool, bool),
            felt252
        ) {
            if !self.hasHTLC(htlcId) {
                return (
                    (Zero::zero(), Zero::zero(), Zero::zero()),
                    (0_u256, 0_u256, 0_u256),
                    (false, false),
                    0
                );
            }
            let htlc: HTLC = self.contracts.read(htlcId);
            (
                (htlc.sender, htlc.receiver, htlc.tokenContract),
                (htlc.amount, htlc.hashlock, htlc.timelock),
                (htlc.redeemed, htlc.refunded),
                htlc.secret
            )
        }
    }

    #[generate_trait]
    //TODO: Check if this functions be inline?
    impl InternalFunctions of InternalFunctionsTrait {
        /// @dev Check if there is a HTLC with a given id.
        /// @param htlcId into HTLC mapping.
        fn hasHTLC(self: @ContractState, htlcId: u256) -> bool {
            let exists: bool = (!self.contracts.read(htlcId).sender.is_zero());
            exists
        }

        /// @dev Check if all the HTLCs with the given ids exist.
        /// @param _ htlcId into HTLCs mapping.
        fn hasHTLCs(self: @ContractState, htlcIds: Span<u256>) -> bool {
            let mut i: usize = 0;
            let mut exists: bool = true;
            while i < htlcIds
                .len() {
                    if self.contracts.read(*htlcIds[i]).sender.is_zero() {
                        exists = false;
                        break;
                    }
                };
            exists
        }
    }
}
