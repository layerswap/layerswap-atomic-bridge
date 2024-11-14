module htlcCoin::htlc {
    use sui::{
        event,
        dynamic_field::{Self as df},
        coin::Coin,
        sui::SUI,
    };
    use std::{
        hash,
        string::{String},
        type_name::{get, TypeName}
    };

    /// The object that we will attach htlcs to.
    public struct HTLCs has key, store {
        id: UID,
        // bag: Bag,
    }

    /// The `name` of the DF that holds the coins.
    public struct HTLCObjectKey has copy, store, drop {}

    public struct HTLC has key, store {
    // public struct HTLC has key, store {
        id: UID,
        dstAddress: String,
        dstChain: String,
        dstAsset: String,
        srcAsset: String,       
        sender: address,
        receiver: address,
        hashlock: vector<u8>,
        secret: vector<u8>, 
        amount: u64,
        timelock: u64,
        tokenContract: TypeName,
        redeemed: bool,
        refunded: bool,
    }

    #[error]
    const E_HTLC_DOES_NOT_EXIST: vector<u8> = b"HTLC Does Not Exist";
    #[error]
    const E_HTLC_ALREADY_EXIST: vector<u8> = b"HTLC Already Exists";
    #[error]
    const E_FUNDS_NOT_SENT: vector<u8> = b"Funds Can Not Be Zero";
    #[error]
    const E_NOT_FUTURE_TIMELOCK: vector<u8> = b"Not Future TimeLock";
    #[error]
    const E_NOT_PASSED_TIMELOCK: vector<u8> = b"Not Passed TimeLock";
    #[error]
    const E_ALREADY_REDEEMED: vector<u8> = b"Funds Are Alredy Redeemed";
    #[error]
    const E_ALREADY_REFUNDED: vector<u8> = b"Funds Are Alredy Refunded";
    #[error]
    const E_HASHLOCK_ALREADY_SET: vector<u8> = b"Hashlock Already Set";
    #[error]
    const E_HASHLOCK_NOT_MATCH: vector<u8> = b"Does Not Match the Hashlock";
    #[error]
    const E_UNAUTHORIZED_ACCESS: vector<u8> = b"Unauthorized Access";

    /// Events
    public struct TokenCommitted has copy, drop {
        id: ID,
        hopChains: vector<String>,
        hopAssets: vector<String>,
        hopAddress: vector<String>,
        dstChain: String,
        dstAddress:  String,
        dstAsset: String,
        sender: address,
        receiver: address,
        srcAsset:  String,
        amount: u64,
        timelock: u64,    
    }

    public struct TokenLocked has copy, drop {
        id: ID,
        hashlock: vector<u8>,
        dstChain: String,
        dstAddress:  String,
        dstAsset: String,
        sender: address,
        receiver: address,
        srcAsset:  String,
        amount: u64,
        timelock: u64,    
    }

    public struct TokenRedeemed has copy, drop {
        id: ID,
        redeemAddress: address,
        secret: vector<u8>,
        hashlock: vector<u8>
    }

    public struct TokenRefunded has copy, drop {
        id: ID,
    }

    // Called only once, upon module publication. 
    fun init(ctx: &mut TxContext) {
        transfer::share_object(HTLCs {
            id: object::new(ctx)
        });
    }

    /// commit function to create a new HTLC
    public entry fun commit<CoinType: key + store>(
        htlcs: &mut HTLCs,
        coins: Coin<CoinType>,
        timelock: u64,
        receiver: address,
        srcAsset: String,
        dstChain: String,
        dstAddress: String,
        dstAsset: String,
        ctx: &mut TxContext
    ) {
        let htlc_id: ID = ctx.fresh_object_address().to_id();
        assert!(!df::exists_(&htlcs.id, htlc_id), E_HTLC_ALREADY_EXIST);
        assert!(timelock > ctx.epoch_timestamp_ms(), E_NOT_FUTURE_TIMELOCK);
        assert!(coins.value() != 0, E_FUNDS_NOT_SENT);

        let mut htlc = HTLC {
            id: object::new(ctx),
            dstAddress: dstAddress,
            dstChain: dstChain,
            dstAsset: dstAsset,
            srcAsset: srcAsset,
            sender: ctx.sender(),
            receiver: receiver,
            hashlock: vector[],
            secret:vector[],
            amount: coins.value(),
            timelock: timelock,
            tokenContract: get<CoinType>(),
            redeemed: false,
            refunded: false,
        };
        let empty: vector<String> = vector[];
        event::emit(TokenCommitted {
        id: htlc_id,
        hopChains: empty,
        hopAssets: empty,
        hopAddress: empty,
        dstChain: dstChain,
        dstAddress: dstAddress,
        dstAsset: dstAsset,
        sender: ctx.sender(),
        receiver: receiver,
        srcAsset: srcAsset,
        amount: coins.value(),
        timelock: timelock, 
        });

        df::add(&mut htlc.id, HTLCObjectKey {}, coins);
        df::add(&mut htlcs.id, htlc_id, htlc);
       
    }
    /// Lock function to create a new HTLC
    public entry fun lock<CoinType: key + store>(
        htlcs: &mut HTLCs,
        htlc_id: ID,
        coins: Coin<CoinType>,
        hashlock: vector<u8>,
        timelock: u64,
        receiver: address,
        srcAsset: String,
        dstChain: String,
        dstAddress: String,
        dstAsset: String,
        ctx: &mut TxContext
    ) {
        assert!(!df::exists_(&htlcs.id, htlc_id), E_HTLC_ALREADY_EXIST);
        assert!(timelock > ctx.epoch_timestamp_ms(), E_NOT_FUTURE_TIMELOCK);
        assert!(coins.value() != 0, E_FUNDS_NOT_SENT);

        let mut htlc = HTLC {
            id: object::new(ctx),
            dstAddress: dstAddress,
            dstChain: dstChain,
            dstAsset: dstAsset,
            srcAsset: srcAsset,
            sender: ctx.sender(),
            receiver: receiver,
            hashlock: hashlock,
            secret: vector[],
            amount: coins.value(),
            timelock: timelock,
            tokenContract: get<CoinType>(),
            redeemed: false,
            refunded: false,
        };

        event::emit(TokenLocked {
        id: htlc_id,
        hashlock: hashlock,
        dstChain: dstChain,
        dstAddress: dstAddress,
        dstAsset: dstAsset,
        sender: ctx.sender(),
        receiver: receiver,
        srcAsset: srcAsset,
        amount: coins.value(),
        timelock: timelock, 
        });

        df::add(&mut htlc.id, HTLCObjectKey {}, coins);
        df::add(&mut htlcs.id, htlc_id, htlc);
       
    }

    public entry fun addLock(
        htlcs: &mut HTLCs,
        htlc_id: ID,
        _hashlock: vector<u8>,
        timelock: u64,
        ctx: &mut TxContext
    ){
        assert!(df::exists_(&htlcs.id, htlc_id), E_HTLC_DOES_NOT_EXIST);
        let htlc: &mut HTLC = df::borrow_mut(&mut htlcs.id, htlc_id);

        assert!(timelock > ctx.epoch_timestamp_ms(), E_NOT_FUTURE_TIMELOCK);
        assert!(!htlc.redeemed, E_ALREADY_REDEEMED);
        assert!(!htlc.refunded, E_ALREADY_REFUNDED);
        assert!(htlc.hashlock.is_empty(), E_HASHLOCK_ALREADY_SET);
        assert!(htlc.sender == ctx.sender(), E_UNAUTHORIZED_ACCESS);
        
        htlc.hashlock = _hashlock;
        htlc.timelock = timelock;
       
       
        event::emit(TokenLocked {
        id: htlc_id,
        hashlock: _hashlock,
        dstChain: htlc.dstChain,
        dstAddress: htlc.dstAddress,
        dstAsset: htlc.dstAsset,
        sender: htlc.sender,
        receiver: htlc.receiver,
        srcAsset: htlc.srcAsset,
        amount: htlc.amount,
        timelock: timelock, 
        });
    }
    public entry fun redeem(
        htlcs: &mut HTLCs,
        htlc_id: ID,
        secret: vector<u8>,
        ctx: &TxContext
    ) {
        assert!(df::exists_(&htlcs.id, htlc_id), E_HTLC_DOES_NOT_EXIST);
        let htlc: &mut HTLC = df::borrow_mut(&mut htlcs.id, htlc_id);

        assert!(!htlc.redeemed, E_ALREADY_REDEEMED);
        assert!(!htlc.refunded, E_ALREADY_REFUNDED);
        assert!(hash::sha2_256(secret) == htlc.hashlock, E_HASHLOCK_NOT_MATCH);

        let locked_coins: Coin<SUI> = df::remove(&mut htlc.id, HTLCObjectKey {});
         
        event::emit(TokenRedeemed { id:htlc_id, redeemAddress:ctx.sender(), secret:secret, hashlock:htlc.hashlock});

        htlc.redeemed = true;
        htlc.secret = secret;
       
        transfer::public_transfer(locked_coins, htlc.receiver);
    }

    public entry fun refund(
        htlcs: &mut HTLCs,
        htlc_id: ID,
        ctx: &TxContext
    ) {
        assert!(df::exists_(&htlcs.id, htlc_id), E_HTLC_DOES_NOT_EXIST);

        let htlc: &mut HTLC = df::borrow_mut(&mut htlcs.id, htlc_id);
        assert!(!htlc.redeemed, E_ALREADY_REDEEMED);
        assert!(!htlc.refunded, E_ALREADY_REFUNDED);
        assert!(htlc.timelock <= ctx.epoch_timestamp_ms()*1000, E_NOT_PASSED_TIMELOCK);

        htlc.refunded = true;
        
        let locked_coins: Coin<SUI> = df::remove(&mut htlc.id, HTLCObjectKey {});

        event::emit(TokenRefunded { id:htlc_id});

        transfer::public_transfer(locked_coins, htlc.sender);
    }

     public entry fun getDetails(
        htlcs: &HTLCs,
        htlc_id: ID,
    ):(String, String, String, String,
    address, address, vector<u8>, vector<u8>,
    u64, u64, TypeName, bool, bool) {
        assert!(df::exists_(&htlcs.id, htlc_id), E_HTLC_DOES_NOT_EXIST);
        let htlc: &HTLC = df::borrow(&htlcs.id, htlc_id);

        (htlc.dstAddress, htlc.dstChain, htlc.dstAsset, htlc.srcAsset, 
        htlc.sender, htlc.receiver, htlc.hashlock, htlc.secret,
        htlc.amount, htlc.timelock,htlc.tokenContract, htlc.redeemed, htlc.refunded)
        
    }

}