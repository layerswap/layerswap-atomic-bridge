use starknet::ContractAddress;
#[starknet::interface]
pub trait IMessenger<TContractState> {
    fn notifyHTLC(
        ref self: TContractState,
        htlcId: u256,
        sender: ContractAddress,
        srcAddress: ContractAddress,
        amount: u256,
        timelock: u256,
        hashlock: u256,
        dstAddress: felt252,
        phtlcId: u256,
        tokenContract: ContractAddress,
    );
}

#[starknet::contract]
mod Messenger {
    use starknet::ContractAddress;
    use core::traits::Into;

    #[storage]
    struct Storage {}

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        HTLCNotificationReceived: HTLCNotificationReceived,
    }

    #[derive(Drop, starknet::Event)]
    struct HTLCNotificationReceived {
        htlcId: u256,
        #[key]
        sender: ContractAddress,
        #[key]
        srcAddress: ContractAddress,
        amount: u256,
        timelock: u256,
        #[key]
        hashlock: u256,
        dstAddress: felt252,
        phtlcId: u256,
        tokenContract: ContractAddress,
    }

    #[abi(embed_v0)]
    impl Messenger of super::IMessenger<ContractState> {
        fn notifyHTLC(
            ref self: ContractState,
            htlcId: u256,
            sender: ContractAddress,
            srcAddress: ContractAddress,
            amount: u256,
            timelock: u256,
            hashlock: u256,
            dstAddress: felt252,
            phtlcId: u256,
            tokenContract: ContractAddress,
        ) {
            self
                .emit(
                    HTLCNotificationReceived {
                        htlcId,
                        sender,
                        srcAddress,
                        amount,
                        timelock,
                        hashlock,
                        dstAddress,
                        phtlcId,
                        tokenContract,
                    }
                )
        }
    }
}
