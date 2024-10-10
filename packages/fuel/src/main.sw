contract;

use std::{
    auth::*,
    asset::*,
    block::*,
    context::*,
    bytes::Bytes,
    call_frames::*,
    hash::*,
    storage::storage_vec::*,
    b512::B512,
    ecr::ec_recover_address,
    bytes_conversions::{u64::*, u256::*, b256::*},
};

abi LayerswapV8 {
    #[payable]
    #[storage(read,write)]
    fn commit(dstChain: str[64],        
              dstAsset: str[64],        
              dstAddress: str[64],      
              srcAsset: str[64],        
              srcReceiver: Address,
              timelock: u64) -> u256;

    #[storage(read,write)]
    fn refund(Id: u256) -> bool;

    #[storage(read,write)]
    fn add_lock(Id: u256, hashlock: b256, timelock: u64) -> u256; 

    #[storage(read,write)]
    fn add_lock_sig(signature: B512,Id: u256, hashlock: b256, timelock: u64) -> u256;

    #[payable]
    #[storage(read,write)]
    fn lock(Id: u256, 
            hashlock: b256, 
            timelock: u64, 
            srcReceiver: Address, 
            srcAsset: str[64],
            dstChain: str[64],
            dstAddress: str[64],
            dstAsset: str[64]) -> u256;

    #[storage(read,write)]
    fn redeem(Id: u256, secret: u256) -> bool;

    #[storage(read)]
    fn get_details(Id: u256) -> Option<HTLC>;

    #[storage(read)]
    fn get_contracts(senderAddr: Address) -> Vec<u256>;

    #[storage(read,write)]
    fn initialize(salt: u256) -> bool;
}

pub struct TokenCommitted  {Id: u256,
                            dstChain: str[64],
                            dstAsset: str[64],
                            dstAddress: str[64],
                            sender: Address,
                            srcReceiver: Address,
                            srcAsset: str[64],
                            amount: u64,
                            timelock: u64,
                            assetId: AssetId
}

pub struct TokenLocked {Id: u256, 
                        hashlock: b256, 
                        dstChain: str[64],
                        dstAddress: str[64],
                        dstAsset: str[64],
                        sender: Address, 
                        srcReceiver: Address, 
                        srcAsset: str[64],
                        amount: u64,
                        timelock: u64,
                        assetId: AssetId
}

pub struct TokenLockAdded  {Id: u256,
                            hashlock: b256,
                            timelock: u64
}

pub struct TokenRefuned { Id: u256 }

pub struct TokenRedeemed { Id: u256,
                           redeemAddress: Identity }

pub struct HTLC {
                dstAddress: str[64],
                dstChain: str[64],
                dstAsset: str[64],
                srcAsset: str[64],
                sender: Address,
                srcReceiver: Address,
                hashlock: b256,
                timelock: u64,
                amount: u64,
                secret: u256,
                assetId: AssetId,
                redeemed: bool,
                refunded: bool
}

storage {
    contracts: StorageMap<u256, HTLC> = StorageMap::<u256, HTLC> {},
    contractIds: StorageVec<u256> = StorageVec {},
    contractNonce: u256 = 0,
    contractSeed: u256 = 0,
}

#[storage(read)]
fn has_htlc(Id: u256) -> bool {
    match storage.contracts.get(Id).try_read() {
        Some(_) => true,  
        None => false, 
    }
}

#[storage(read,write)]
fn apply_lock(Id: u256, hashlock: b256, timelock: u64) -> u256 {
    let mut htlc: HTLC = storage.contracts.get(Id).try_read().unwrap();
    require(!htlc.refunded,"Already Refunded");
    require(timelock > timestamp(),"Not Future Timelock");
    require(htlc.hashlock == b256::from(0),"Hashlock Already Set");
    htlc.hashlock = hashlock;
    htlc.timelock = timelock;
    storage.contracts.insert(Id, htlc);

    log(TokenLockAdded  {Id: Id,
                        hashlock: hashlock,
                        timelock: timelock
        });
    Id
}

impl LayerswapV8 for Contract {
    #[storage(read,write)]
    fn initialize(salt: u256) -> bool{
        let num: u256 = storage.contractSeed.read();
        match num {
            0 => {
                    let hashedSalt: b256 = (sha256(salt + timestamp().as_u256()));
                    storage.contractSeed.write(hashedSalt.as_u256());
                    true
                }

            _ => {false},
        }
    }

    #[payable]
    #[storage(read,write)]
    fn commit(dstChain: str[64],
              dstAsset: str[64],
              dstAddress: str[64],
              srcAsset: str[64],
              srcReceiver: Address,
              timelock: u64) -> u256 {
        require(msg_amount() > 0, "Funds Not Sent");
        require(timelock > timestamp(), "Not Future Timelock");
        storage.contractNonce.write(storage.contractNonce.read() + 1);

        let Id: u256 = storage.contractSeed.read() ^ storage.contractNonce.read();
        require(!has_htlc(Id), "HTLC Already Exists"); //Remove this check; the ID is guaranteed to be unique.
        storage.contractIds.push(Id);

        let htlc = HTLC {
                        dstAddress: dstAddress,
                        dstChain: dstChain,
                        dstAsset: dstAsset,
                        srcAsset: srcAsset,
                        sender: msg_sender().unwrap().as_address().unwrap(),
                        srcReceiver: srcReceiver,
                        hashlock: b256::zero(),
                        timelock: timelock,
                        amount: msg_amount(),
                        secret: 0,
                        assetId: msg_asset_id(),
                        redeemed: false,
                        refunded: false
                };

        let result = storage.contracts.try_insert(Id,htlc);
        assert(result.is_ok());

        log(TokenCommitted  {Id: Id,
                            dstChain: dstChain,
                            dstAsset: dstAsset,
                            dstAddress: dstAddress,
                            sender:  msg_sender().unwrap().as_address().unwrap(),
                            srcReceiver: srcReceiver ,
                            srcAsset: srcAsset,
                            amount: msg_amount(),
                            timelock: timelock,
                            assetId: msg_asset_id()
                            });
        Id
    }

    #[storage(read,write)]
    fn refund(Id: u256) -> bool {
        require(has_htlc(Id), "HTLC Does Not Exist");
        let mut htlc: HTLC = storage.contracts.get(Id).try_read().unwrap();

        require(!htlc.refunded, "Already Refunded");
        require(!htlc.redeemed, "Already Redeemed");
        require(htlc.timelock < timestamp(), "Not Passed Timelock");

        transfer(Identity::Address(htlc.sender), htlc.assetId, htlc.amount);

        htlc.refunded = true;
        storage.contracts.insert(Id, htlc);

        log(TokenRefuned { Id: Id });
        true
    }

    #[storage(read,write)]
    fn add_lock(Id: u256, hashlock: b256, timelock: u64) -> u256 {
        require(has_htlc(Id), "HTLC Does Not Exist");
        let mut htlc: HTLC = storage.contracts.get(Id).try_read().unwrap();
        let sender = match msg_sender().unwrap() {
                        Identity::Address(addr) => addr,  
                        _ => {require(false, "No Allowance");
                        // This line will never be reached,just returning dummy value 
                        // as all branches should return same value
                              Address::from(0x0000000000000000000000000000000000000000000000000000000000000000) },     
                    };
        require(htlc.sender == sender, "No Allowance");
        apply_lock(Id,hashlock,timelock)
    }

    #[storage(read,write)]
    fn add_lock_sig(signature: B512,Id: u256, hashlock: b256, timelock: u64) -> u256{
        require(has_htlc(Id), "HTLC Does Not Exist");
        let mut htlc: HTLC = storage.contracts.get(Id).try_read().unwrap();
        let IdBytes: b256 = Id.into();
        let timelockBytes: b256 = timelock.as_u256().into();
        let message: [b256;3] = [IdBytes,hashlock,timelockBytes];
        let messageHash = sha256(message);
        require(htlc.sender == ec_recover_address(signature,messageHash).unwrap(),"Invalid Signature");
        apply_lock(Id,hashlock,timelock)
    }

    #[payable]
    #[storage(read,write)]
    fn lock(Id: u256, 
            hashlock: b256, 
            timelock: u64, 
            srcReceiver: Address, 
            srcAsset: str[64],
            dstChain: str[64],
            dstAddress: str[64],
            dstAsset: str[64]) -> u256 {
        require(msg_amount() > 0,"Funds Not Sent");
        require(timelock > timestamp(),"Not Future Timelock");
        require(!has_htlc(Id),"HTLC Already Exists");

        let htlc = HTLC {
                dstAddress: dstAddress,
                dstChain: dstChain,
                dstAsset: dstAsset,
                srcAsset: srcAsset,
                sender: msg_sender().unwrap().as_address().unwrap(),
                srcReceiver: srcReceiver,
                hashlock: hashlock,
                timelock: timelock,
                amount: msg_amount(),
                secret: 0,
                assetId: msg_asset_id(),
                redeemed: false,
                refunded: false
        };

        let result = storage.contracts.try_insert(Id,htlc);
        assert(result.is_ok());
        storage.contractIds.push(Id);
        log(TokenLocked {Id: Id, 
                        hashlock: hashlock, 
                        dstChain: dstChain,
                        dstAddress: dstAddress,
                        dstAsset: dstAsset,
                        sender: msg_sender().unwrap().as_address().unwrap(), 
                        srcReceiver: srcReceiver, 
                        srcAsset: srcAsset,
                        amount: msg_amount(),
                        timelock: timelock,
                        assetId: msg_asset_id()
                    });
        Id
    }

    #[storage(read,write)]
    fn redeem(Id: u256, secret: u256) -> bool {
        require(has_htlc(Id), "HTLC Does Not Exist");
        let mut htlc: HTLC = storage.contracts.get(Id).try_read().unwrap();

        require(htlc.hashlock == sha256(secret),"Hashlock Not Match");
        require(!htlc.refunded,"Already Refunded");
        require(!htlc.redeemed,"Already Redeemed");

        htlc.secret = secret;
        htlc.redeemed = true;
        storage.contracts.insert(Id, htlc);
        transfer(Identity::Address(htlc.srcReceiver), htlc.assetId, htlc.amount);
        log(TokenRedeemed { Id: Id,
                           redeemAddress: msg_sender().unwrap() });
        true
    }

    #[storage(read)]
    fn get_details(Id: u256) -> Option<HTLC> {
        match storage.contracts.get(Id).try_read() {
            Some(htlc) => Some(htlc),
            None => {
                log("HTLC does not exist");
                None
            }
        }
    }

    #[storage(read)]
    fn get_contracts(senderAddr: Address) -> Vec<u256> {
        let mut Ids: Vec<u256> = Vec::new();
        let mut i = 0;
        while i < storage.contractIds.len() {
            if let Some(contract_id_key) = storage.contractIds.get(i) {
                let contract_id = contract_id_key.read();
                match storage.contracts.get(contract_id).try_read() {
                    Some(htlc) => {
                        if senderAddr == htlc.sender{
                            Ids.push(contract_id);
                        }
                    },
                    _ => {}
                };
            }
            i += 1;
        }
        Ids
    }
}



