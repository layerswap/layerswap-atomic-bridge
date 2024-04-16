use starknet::ContractAddress;
#[starknet::interface]
pub trait IHashedTimelockERC20<TContractState> {
    fn createHTLC(
        ref self: TContractState,
        _receiver: ContractAddress,
        _hashlock: u256,
        _timelock: u256,
        _tokenContract: ContractAddress,
        _amount: u256,
        _chainId: u256,
        _targetCurrencyReceiverAddress: felt252
    ) -> u256;
    fn batchCreateHTLC(
        ref self: TContractState,
        _receivers: Span<ContractAddress>,
        _hashlocks: Span<u256>,
        _timelocks: Span<u256>,
        _tokenContracts: Span<ContractAddress>,
        _amounts: Span<u256>,
        _chainIds: Span<u256>,
        _targetCurrencyReceiverAddresses: Span<felt252>
    ) -> Span<u256>;
    fn redeem(ref self: TContractState, _contractId: u256, _secret: felt252) -> bool;
    fn batchRedeem(
        ref self: TContractState, _contractIds: Span<u256>, _secrets: Span<felt252>
    ) -> bool;
    fn refund(ref self: TContractState, _contractId: u256) -> bool;
    fn getHTLCDetails(
        self: @TContractState, _contractId: u256
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
///  1) createHTLC(receiver, hashlock, timelock, tokenContract, amount) - a
///      sender calls this to create a new HTLC on a given token (tokenContract)
///       for a given amount. A uint256 contract id is returned
///  2) redeem(contractId, secret) - once the receiver knows the secret of
///      the hashlock hash they can claim the tokens with this function
///  3) refund() - after timelock has expired and if the receiver did not
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
        BatchTokenTransfersCompleted: BatchTokenTransfersCompleted,
    }
    #[derive(Drop, starknet::Event)]
    struct TokenTransferInitiated {
        #[key]
        contractId: u256,
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
        contractId: u256
    }
    #[derive(Drop, starknet::Event)]
    struct TokenTransferRefunded {
        #[key]
        contractId: u256
    }
    #[derive(Drop, starknet::Event)]
    struct BatchTokenTransfersCompleted {
        #[key]
        contractIds: Span<u256>
    }
    #[abi(embed_v0)]
    impl HashedTimelockERC20 of super::IHashedTimelockERC20<ContractState> {
        /// @dev Sender / Payer sets up a new hash time lock contract depositing the
        /// funds and providing the reciever and terms.
        /// @param _receiver Receiver of the funds.
        /// @param _hashlock A sha-256 hash hashlock.
        /// @param _timelock UNIX epoch seconds time that the lock expires at.
        ///                  Refunds can be made after this time.
        /// @return contractId Id of the new HTLC. This is needed for subsequent
        ///                    calls.
        fn createHTLC(
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
            assert!(_amount != 0, "Funds can not be zero");

            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_address(get_caller_address());
            bytes.append_address(_receiver);
            bytes.append_address(_tokenContract);
            bytes.append_u256(_amount);
            bytes.append_u256(_hashlock);
            bytes.append_u256(_timelock);
            let contractId = bytes.sha256();
            assert!(!self.hasContract(contractId), "Contract already exists");
            IERC20Dispatcher { contract_address: _tokenContract }
                .transfer_from(get_caller_address(), get_contract_address(), _amount);
            self
                .contracts
                .write(
                    contractId,
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
                        contractId: contractId,
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
            contractId
        }

        /// @notice Allows the batch creation of multiple Hashed Time-Lock Contracts (HTLCs).
        /// @dev This function is used to create multiple HTLCs simultaneously.
        /// @param _receivers An array containing receivers of the corresponding funds.
        /// @param _hashlocks An array containing the sha-256 hash hashlocks.
        /// @param _timelocks An array containing the UNIX epoch seconds time that the locks expire at.
        /// @return contractId Ids of the new HTLCs.
        fn batchCreateHTLC(
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
                    && _receivers.len() == _amounts.len(),
                "incorrect data"
            );
            let mut contractIds: Array<u256> = ArrayTrait::new();
            let mut i: usize = 0;
            while i < _amounts
                .len() {
                    assert!(*_timelocks[i] > get_block_timestamp().into(), "Not Future TimeLock");
                    assert!(*_amounts[i] != 0, "Funds can not be Zero");
                    let mut bytes: Bytes = BytesTrait::new(0, array![]);
                    bytes.append_address(get_caller_address());
                    bytes.append_address(*_receivers[i]);
                    bytes.append_address(*_tokenContracts[i]);
                    bytes.append_u256(*_amounts[i]);
                    bytes.append_u256(*_hashlocks[i]);
                    bytes.append_u256(*_timelocks[i]);
                    contractIds.append(bytes.sha256());
                    assert!(!self.hasContract(*contractIds[i]), "Contract already exists");

                    IERC20Dispatcher { contract_address: *_tokenContracts[i] }
                        .transfer_from(get_caller_address(), get_contract_address(), *_amounts[i]);
                    self
                        .contracts
                        .write(
                            *contractIds[i],
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
                                contractId: *contractIds[i],
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
            contractIds.span()
        }

        /// @dev Called by the receiver once they know the secret of the hashlock.
        /// This will transfer the locked funds to their address.
        ///
        /// @param _contractId Id of the HTLC.
        /// @param _secret sha256(_secret) should equal the contract hashlock.
        /// @return bool true on success
        fn redeem(ref self: ContractState, _contractId: u256, _secret: felt252) -> bool {
            assert!(self.hasContract(_contractId), "Contract does not exist");
            let htlc: HTLC = self.contracts.read(_contractId);

            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_felt252(_secret);
            let pre = bytes.sha256();
            let mut bytes: Bytes = BytesTrait::new(0, array![]);
            bytes.append_u256(pre);
            let hash_pre = bytes.sha256();
            assert!(htlc.hashlock == hash_pre, "Does not match the hashlock");
            assert!(!htlc.redeemed, "Funds are alredy redeemed");
            assert!(!htlc.refunded, "Funds are alredy refunded");
            //Todo make this error comment more understandable
            assert!(htlc.timelock > get_block_timestamp().into(), "Not future time lock?");
            self
                .contracts
                .write(
                    _contractId,
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
            self.emit(TokenTransferClaimed { contractId: _contractId });
            true
        }

        /// @notice Allows the batch redemption of tokens locked in multiple Hashed Time-Lock Contracts (HTLCs).
        /// @dev This function is used to redeem tokens from multiple HTLCs simultaneously, providing the corresponding secrets for each HTLC.
        /// @param _contractIds An array containing the unique identifiers (IDs) of the HTLCs from which tokens are to be redeemed.
        /// @param _secrets An array containing the secret values corresponding to each HTLC in _contractIds.
        /// @return A boolean indicating whether the batch redemption was successful.
        /// @dev Emits an BatchTokenTransfersCompleted event upon successful batch redemption.
        fn batchRedeem(
            ref self: ContractState, _contractIds: Span<u256>, _secrets: Span<felt252>
        ) -> bool {
            assert!(_contractIds.len() == _secrets.len(), "incorrect data");
            let contractIds_clone = _contractIds.clone();
            let ContractIds_event = _contractIds.clone();
            assert!(self.hasContracts(_contractIds), "Contract does not exist");
            let mut i: usize = 0;
            while i < contractIds_clone
                .len() {
                    let htlc: HTLC = self.contracts.read(*contractIds_clone[i]);
                    let mut bytes: Bytes = BytesTrait::new(0, array![]);
                    bytes.append_felt252(*_secrets[i]);
                    let pre = bytes.sha256();
                    let mut bytes: Bytes = BytesTrait::new(0, array![]);
                    bytes.append_u256(pre);
                    let hash_pre = bytes.sha256();
                    assert!(htlc.hashlock == hash_pre, "Does not match the hashlock");
                    assert!(!htlc.redeemed, "Funds are alredy redeemed");
                    assert!(!htlc.refunded, "Funds are alredy refunded");
                    //Todo make this error comment more understandable
                    assert!(htlc.timelock > get_block_timestamp().into(), "Not future time lock?");
                    self
                        .contracts
                        .write(
                            *contractIds_clone[i],
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
                    i += 1;
                };
            self.emit(BatchTokenTransfersCompleted { contractIds: ContractIds_event });
            true
        }

        /// @dev Called by the sender if there was no redeem AND the time lock has
        /// expired. This will refund the contract amount.
        ///
        /// @param _contractId Id of HTLC to refund from.
        /// @return bool true on success
        fn refund(ref self: ContractState, _contractId: u256) -> bool {
            assert!(self.hasContract(_contractId), "Contract does not exist");
            let htlc: HTLC = self.contracts.read(_contractId);

            assert!(!htlc.refunded, "Funds are already refunded");
            assert!(!htlc.redeemed, "Funds are already redeemed");
            assert!(htlc.timelock <= get_block_timestamp().into(), "Not passed time lock");

            self
                .contracts
                .write(
                    _contractId,
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
            self.emit(TokenTransferRefunded { contractId: _contractId });
            true
        }

        /// @dev Get contract details.
        /// @param _contractId HTLC contract id
        fn getHTLCDetails(
            self: @ContractState, _contractId: u256
        ) -> (
            (ContractAddress, ContractAddress, ContractAddress),
            (u256, u256, u256),
            (bool, bool),
            felt252
        ) {
            if !self.hasContract(_contractId) {
                return (
                    (Zero::zero(), Zero::zero(), Zero::zero()),
                    (0_u256, 0_u256, 0_u256),
                    (false, false),
                    0
                );
            }
            let htlc: HTLC = self.contracts.read(_contractId);
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
        /// @dev Check if there is a contract with a given id.
        /// @param _contractId Id into contracts mapping.
        fn hasContract(self: @ContractState, _contractId: u256) -> bool {
            let exists: bool = (!self.contracts.read(_contractId).sender.is_zero());
            exists
        }

        /// @dev Check if all the contracts with the given ids exist.
        /// @param _contractId Id into contracts mapping.
        fn hasContracts(self: @ContractState, _contractIds: Span<u256>) -> bool {
            let mut i: usize = 0;
            let mut exists: bool = true;
            while i < _contractIds
                .len() {
                    if self.contracts.read(*_contractIds[i]).sender.is_zero() {
                        exists = false;
                        break;
                    }
                };
            exists
        }
    }
}
