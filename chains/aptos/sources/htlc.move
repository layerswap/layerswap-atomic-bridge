module htlc::htlc {
    use std::error;
    use std::hash;
    use std::vector;
    use std::string::{String};
    use aptos_std::table;
    use aptos_std::ed25519;
    use aptos_std::type_info;
    use aptos_framework::signer;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_framework::coin::{Self as coin, Coin};
    // use aptos_framework::object::{Object, ObjectCore};
    
    const DEPLOYER: address = @htlc;

    // Error codes
    const E_NOT_DEPLOYER: u64 = 0;
    const E_HTLC_DOES_NOT_EXIST: u64 = 1;
    const E_HTLC_ALREADY_EXIST: u64 = 2;
    const E_FUNDS_NOT_SENT: u64 = 3;
    const E_NOT_FUTURE_TIMELOCK: u64 = 4;
    const E_NOT_PASSED_TIMELOCK: u64 = 5;
    const E_ALREADY_REDEEMED: u64 = 6;
    const E_ALREADY_REFUNDED: u64 = 7;
    const E_HASHLOCK_ALREADY_SET: u64 = 8;
    const E_HASHLOCK_NOT_MATCH: u64 = 9;
    const E_UNAUTHORIZED_ACCESS: u64 = 10;
    const E_NOT_VALID_SIGNATURE: u64 = 11;

    struct Message has drop{
        Id: u64,
        hashlock: vector<u8>,
        timelock: u64,
    }

    // The main HTLC structure including the coin
    struct HTLC<phantom CoinType> has key, store{
        dst_address: String,
        dst_chain: String,
        dst_asset: String,
        src_asset: String,
        sender: address,
        sender_key: vector<u8>,
        receiver: address,
        hashlock: vector<u8>,
        secret: vector<u8>,
        amount: u64,
        timelock: u64,
        token_contract: address,
        coins: Coin<CoinType>,
        redeemed: bool,
        refunded: bool,
    }

    // The HTLC Manager that keeps track of all HTLCs
    struct HTLCManager<phantom CoinType> has key {
        htlcs: table::Table<u64, HTLC<CoinType>>,
        counter: u64
    }

    // Event structures
    #[event]
    struct TokenCommitted has drop, store {
        id: u64,
        hop_chains: vector<String>,
        hop_assets: vector<String>,
        hop_addresses: vector<String>,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        sender: address,
        receiver: address,
        src_asset: String,
        amount: u64,
        timelock: u64,
    }
    #[event]
    struct TokenLocked has drop, store {
        id: u64,
        hashlock: vector<u8>,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        sender: address,
        receiver: address,
        src_asset: String,
        amount: u64,
        timelock: u64,
    }
    #[event]
    struct TokenRedeemed has drop, store {
        id: u64,
        redeem_address: address,
        secret: vector<u8>,
        hashlock: vector<u8>,
    }
    #[event]
    struct TokenRefunded has drop, store {
        id: u64,
    }

    // Initialization function to set up the HTLC Manager
    entry fun init_module<CoinType>(sender: &signer) {

        // assert!(signer::address_of(sender) == DEPLOYER, E_NOT_DEPLOYER);

        // object::disable_ungated_transfer(&transfer_ref);
        move_to(sender, HTLCManager {
            htlcs: table::new<u64,HTLC<CoinType>>(),
            counter: 0
        });
    }
//     fun freeze_object(my_object: Object<MyObject>) {
//     let transfer_ref = &borrow_global_mut<MyObject>(object::object_address(&my_object)).transfer_ref;
//     object::disable_ungated_transfer(transfer_ref);
// }

    // Commit function to create a new HTLC
    public entry fun commit<CoinType>(
        sender: &signer,
        sender_key: vector<u8>,
        timelock: u64,
        receiver: address,
        src_asset: String,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        amount: u64,
        // coins: Coin<CoinType>
    ) acquires HTLCManager{
        let htlc_manager = borrow_global_mut<HTLCManager<CoinType>>(DEPLOYER);
        htlc_manager.counter = htlc_manager.counter + 1;
        let htlc_id = htlc_manager.counter;

        assert!(!table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_ALREADY_EXIST));
        assert!(timelock > timestamp::now_seconds(), error::invalid_argument(E_NOT_FUTURE_TIMELOCK));
        assert!(amount > 0, error::invalid_argument(E_FUNDS_NOT_SENT));

        let coins = coin::withdraw<CoinType>(sender, amount);
        let coin_type_info = type_info::type_of<Coin<CoinType>>();
        let coin_contract = type_info::account_address(&coin_type_info);

        let htlc = HTLC<CoinType> {
            dst_address: dst_address,
            dst_chain: dst_chain,
            dst_asset: dst_asset,
            src_asset: src_asset,
            sender: signer::address_of(sender),
            sender_key: sender_key,
            receiver: receiver,
            hashlock: vector[],
            secret: vector[],
            amount: amount,
            timelock: timelock,
            token_contract: coin_contract,
            coins: coins,
            redeemed: false,
            refunded: false,
        };

        table::add(&mut htlc_manager.htlcs, htlc_id, htlc);

        event::emit( TokenCommitted {
            id: htlc_id,
            hop_chains: vector[],
            hop_assets: vector[],
            hop_addresses: vector[],
            dst_chain: dst_chain,
            dst_address: dst_address,
            dst_asset: dst_asset,
            sender: signer::address_of(sender),
            receiver: receiver,
            src_asset: src_asset,
            amount: amount,
            timelock: timelock,
        });
    }

     // Commit function to create a new HTLC
    public entry fun lock<CoinType>(
        sender: &signer,
        sender_key: vector<u8>,
        timelock: u64,
        receiver: address,
        src_asset: String,
        dst_chain: String,
        dst_address: String,
        dst_asset: String,
        amount: u64,
        hashlock: vector<u8>,
    ) acquires HTLCManager{
        let htlc_manager = borrow_global_mut<HTLCManager<CoinType>>(DEPLOYER);
        htlc_manager.counter = htlc_manager.counter + 1;
        let htlc_id = htlc_manager.counter;

        assert!(!table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_ALREADY_EXIST));
        assert!(timelock > timestamp::now_seconds(), error::invalid_argument(E_NOT_FUTURE_TIMELOCK));
        assert!(amount > 0, error::invalid_argument(E_FUNDS_NOT_SENT));

        let coins = coin::withdraw<CoinType>(sender, amount);
        let coin_type_info = type_info::type_of<Coin<CoinType>>();
        let coin_contract = type_info::account_address(&coin_type_info);

        let htlc = HTLC<CoinType> {
            dst_address: dst_address,
            dst_chain: dst_chain,
            dst_asset: dst_asset,
            src_asset: src_asset,
            sender: signer::address_of(sender),
            sender_key: sender_key,
            receiver: receiver,
            hashlock: hashlock,
            secret: vector[],
            amount: amount,
            timelock: timelock,
            token_contract: coin_contract,
            coins: coins,
            redeemed: false,
            refunded: false,
        };

        table::add(&mut htlc_manager.htlcs, htlc_id, htlc);

        event::emit( TokenLocked {
            id: htlc_id,
            hashlock: hashlock,
            dst_chain: dst_chain,
            dst_address: dst_address,
            dst_asset: dst_asset,
            sender: signer::address_of(sender),
            receiver: receiver,
            src_asset: src_asset,
            amount: amount,
            timelock: timelock,
        });
    }

    // Lock function to set a hashlock and timelock on an existing HTLC
    public entry fun add_lock<CoinType>(
        sender: &signer,
        htlc_id: u64,
        hashlock: vector<u8>,
        timelock: u64,
    ) acquires HTLCManager {
        let htlc_manager = borrow_global_mut<HTLCManager<CoinType>>(DEPLOYER);
        assert!(table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_DOES_NOT_EXIST));

        let htlc = table::borrow_mut(&mut htlc_manager.htlcs, htlc_id);

        assert!(timelock > timestamp::now_seconds(), error::invalid_argument(E_NOT_FUTURE_TIMELOCK));
        assert!(!htlc.redeemed, error::invalid_argument(E_ALREADY_REDEEMED));
        assert!(!htlc.refunded, error::invalid_argument(E_ALREADY_REFUNDED));
        assert!(vector::is_empty(&htlc.hashlock), error::invalid_argument(E_HASHLOCK_ALREADY_SET));
        assert!(htlc.sender == signer::address_of(sender), error::invalid_argument(E_UNAUTHORIZED_ACCESS));
        htlc.hashlock = hashlock;
        htlc.timelock = timelock;

        event::emit(TokenLocked {
            id: htlc_id,
            hashlock: hashlock,
            dst_chain: htlc.dst_chain,
            dst_address: htlc.dst_address,
            dst_asset: htlc.dst_asset,
            sender: htlc.sender,
            receiver: htlc.receiver,
            src_asset: htlc.src_asset,
            amount: htlc.amount,
            timelock: timelock,
        });
    }

    // Lock function to set a hashlock and timelock on an existing HTLC
    public entry fun add_lock_sig<CoinType>(
        htlc_id: u64,
        hashlock: vector<u8>,
        timelock: u64,
        signature_bytes: vector<u8>,
    ) acquires HTLCManager {
        let htlc_manager = borrow_global_mut<HTLCManager<CoinType>>(DEPLOYER);
        assert!(table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_DOES_NOT_EXIST));

        let htlc = table::borrow_mut(&mut htlc_manager.htlcs, htlc_id);

        let pubkey = ed25519::new_unvalidated_public_key_from_bytes(htlc.sender_key);
        let signature = ed25519::new_signature_from_bytes(signature_bytes);
        let expected_message = Message {
            Id: htlc_id,
            hashlock: hashlock,
            timelock: timelock
        };
        assert!(ed25519::signature_verify_strict_t(&signature, &pubkey, expected_message), error::invalid_argument(E_NOT_VALID_SIGNATURE));
        assert!(timelock > timestamp::now_seconds(), error::invalid_argument(E_NOT_FUTURE_TIMELOCK));
        assert!(!htlc.redeemed, error::invalid_argument(E_ALREADY_REDEEMED));
        assert!(!htlc.refunded, error::invalid_argument(E_ALREADY_REFUNDED));
        assert!(vector::is_empty(&htlc.hashlock), error::invalid_argument(E_HASHLOCK_ALREADY_SET));
        // assert!(htlc.sender == signer::address_of(sender), error::invalid_argument(E_UNAUTHORIZED_ACCESS));
        htlc.hashlock = hashlock;
        htlc.timelock = timelock;

        event::emit(TokenLocked {
            id: htlc_id,
            hashlock: hashlock,
            dst_chain: htlc.dst_chain,
            dst_address: htlc.dst_address,
            dst_asset: htlc.dst_asset,
            sender: htlc.sender,
            receiver: htlc.receiver,
            src_asset: htlc.src_asset,
            amount: htlc.amount,
            timelock: timelock,
        });
    }

    // Redeem function to transfer the coins to the receiver
    public entry fun redeem<CoinType>(
        user_signing: &signer,
        htlc_id: u64,
        secret: vector<u8>,
    ) acquires HTLCManager{
        let htlc_manager = borrow_global_mut<HTLCManager<CoinType>>(DEPLOYER);
        assert!(table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_DOES_NOT_EXIST));

        let htlc = table::borrow_mut(&mut htlc_manager.htlcs, htlc_id);
        assert!(!htlc.redeemed, error::invalid_argument(E_ALREADY_REDEEMED));
        assert!(!htlc.refunded, error::invalid_argument(E_ALREADY_REFUNDED));
        assert!(hash::sha2_256(secret) == htlc.hashlock, error::invalid_argument(E_HASHLOCK_NOT_MATCH));

        event::emit(TokenRedeemed {
            id: htlc_id,
            redeem_address: signer::address_of(user_signing),
            secret: secret,
            hashlock: htlc.hashlock,
        });

        htlc.redeemed = true;
        htlc.secret = secret;

        let coins = coin::extract_all<CoinType>(&mut htlc.coins);
        coin::deposit<CoinType>(htlc.receiver, coins);
    }

    // Refund function to return the coins to the sender after timelock expiration
    public entry fun refund<CoinType>(
        htlc_id: u64,
    ) acquires HTLCManager{
        let htlc_manager = borrow_global_mut<HTLCManager<CoinType>>(DEPLOYER);
        assert!(table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_DOES_NOT_EXIST));

        let htlc = table::borrow_mut(&mut htlc_manager.htlcs, htlc_id);

        assert!(!htlc.redeemed, error::invalid_argument(E_ALREADY_REDEEMED));
        assert!(!htlc.refunded, error::invalid_argument(E_ALREADY_REFUNDED));
        assert!(htlc.timelock <= timestamp::now_seconds(), error::invalid_argument(E_NOT_PASSED_TIMELOCK));

        event::emit(TokenRefunded {
            id: htlc_id,
        });

        htlc.refunded = true;
        let coins = coin::extract_all<CoinType>(&mut htlc.coins);
        coin::deposit<CoinType>(htlc.sender, coins);
    }

    // Function to get details of an HTLC
    #[view]
    public fun get_details<CoinType>(
        htlc_id: u64,
    ): (
        String, String, String, String,
        address, vector<u8>, address, vector<u8>, vector<u8>,
        u64, u64, address, bool, bool
    )acquires HTLCManager {
        let htlc_manager = borrow_global<HTLCManager<CoinType>>(DEPLOYER);
        assert!(table::contains(&htlc_manager.htlcs, htlc_id), error::invalid_argument(E_HTLC_DOES_NOT_EXIST));

        let htlc = table::borrow(&htlc_manager.htlcs, htlc_id);

        (
            htlc.dst_address, htlc.dst_chain, htlc.dst_asset, htlc.src_asset,
            htlc.sender, htlc.sender_key, htlc.receiver, htlc.hashlock, htlc.secret,
            htlc.amount, htlc.timelock, htlc.token_contract, htlc.redeemed, htlc.refunded
        )
    }

}