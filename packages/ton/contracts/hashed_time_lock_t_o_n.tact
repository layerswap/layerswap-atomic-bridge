import "@stdlib/deploy";
// Messenger notification
message(0x3beb51c2) Notify {
    Id: Int;
    hashlock: Int;
    dstChain: String;
    dstAsset: String;
    dstAddress: String;
    srcAsset: String;
    sender: Address;
    srcReceiver: Address;
    amount: Int;
    timelock: Int;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;  
}

// Lock object
struct HTLC {
    dstAddress: String;
    dstChain: String;
    dstAsset: String;
    srcAsset: String;
    sender: Address;
    senderPubKey: Int;
    srcReceiver: Address;
    secret: Int;
    hashlock: Int;
    amount: Int;
    timelock: Int;
    messenger: Address;
    redeemed: Bool;
    refunded: Bool;
}

// Messages received by contract
message(0x1b564d91) Commit{
    dstChain: String;
    dstAsset: String;
    dstAddress: String;
    srcAsset: String;
    srcReceiver: Address;
    timelock: Int; 
    messenger: Address;
    senderPubKey: Int;
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>;
}

message(0x5cdd41d9) AddLock{
    Id: Int;
    hashlock: Int;
    timelock: Int;
}

message(0xc1d818ff) AddLockSig{
    Id: Int;
    data: Slice; 
    signature: Slice;
}

message(0x12e78cb1) Lock {
    Id: Int;
    hashlock: Int;
    timelock: Int;
    srcReceiver: Address;
    srcAsset: String;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    messenger: Address;
}

message(0x758db085) Redeem {
    Id: Int;
    secret: Int;
}

message(0xad821ef9) Refund {
    Id: Int;
}

// Emitted messages
message(0x71f9f7aa) TokenCommitted{
    Id: Int;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    sender: Address;
    srcReceiver: Address;
    srcAsset: String;
    amount: Int;
    timelock: Int; 
    messenger: Address;
    senderPubKey: Int;
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>;
}

message(0x95b0219d) TokenLocked{
    Id: Int;
    hashlock: Int;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    sender: Address;
    srcReceiver: Address;
    srcAsset: String;
    amount: Int;
    timelock: Int;
    messenger: Address;
}

// String implementation as struct
struct StringImpl{
    data: String;
}

contract LayerswapV8 with Deployable {
    init() {
    self.seed = random(10000000000000000000000000000000000000000000000000000000000000000000000000000,99999999999999999999999999999999999999999999999999999999999999999999999999999);
    }

    contracts: map<Int, HTLC>;
    contractNonce: Int = 0;
    seed: Int;
    zeroAddress: Address = newAddress(0,0x0);
    
    fun contractExists(id: Int): Bool {
        return (self.contracts.get(id) == null)? false : true;
    }

    receive(msg: Commit){
            let ctx: Context = context();

            require(ctx.value != 0,"Funds Not Sent");
            require(msg.timelock > now(),"Not Future Timelock");
            self.contractNonce +=1;
            let Id: Int = self.seed ^ self.contractNonce; 

            //Remove this check; the ID is guaranteed to be unique.
            require(self.contractExists(Id) == false,"HTLC Already Exists");
            self.contracts.set(Id, HTLC {
                                                dstAddress: msg.dstAddress,
                                                dstChain: msg.dstChain,
                                                dstAsset: msg.dstAsset,
                                                srcAsset: msg.srcAsset,
                                                sender: ctx.sender,
                                                senderPubKey: msg.senderPubKey,
                                                srcReceiver: msg.srcReceiver,
                                                secret: 0,
                                                hashlock: 0,
                                                amount: ctx.value,
                                                timelock: msg.timelock, 
                                                messenger: msg.messenger,
                                                redeemed: false,
                                                refunded: false
                                                });


            emit(TokenCommitted{
                                Id: Id,
                                dstChain: msg.dstChain,
                                dstAddress: msg.dstAddress,
                                dstAsset: msg.dstAsset,
                                sender: sender(),
                                srcReceiver: msg.srcReceiver,
                                srcAsset: msg.srcAsset,
                                amount: ctx.value,
                                timelock: msg.timelock,
                                messenger: msg.messenger,
                                senderPubKey: msg.senderPubKey,
                                hopChains: msg.hopChains,
                                hopAssets: msg.hopAssets,
                                hopAddresses: msg.hopAddresses
                                }.toCell());
    }

    receive(msg: AddLock){
        self.addLock(msg,context());
    }

    receive(msg: AddLockSig){
        require(self.contractExists(msg.Id),"Commitment Does Not Exist");
        let htlc: HTLC = (self.contracts.get(msg.Id)!!);
        require(checkSignature(msg.data.hash(),msg.signature,htlc.senderPubKey),"Invalid signature");
        let hashlock: Int = msg.data.loadInt(257);
        let timelock: Int = msg.data.loadInt(257);
        let addLockMessage: AddLock = AddLock{
                                                    Id: msg.Id,
                                                    hashlock: hashlock,
                                                    timelock: timelock
                                                    };
        let ctx: Context = context();
        self.addLock(addLockMessage,ctx);
    }

    receive(msg: Lock){ 
        let ctx: Context = context();
        require(now() < msg.timelock ,"Not Future Timelock");
        require(ctx.value != 0,"Funds Not Sent");

        self.contracts.set(msg.Id,  HTLC {
                                            dstAddress: msg.dstAddress,
                                            dstChain: msg.dstChain,
                                            dstAsset: msg.dstAsset,
                                            srcAsset: msg.srcAsset,
                                            sender: sender(),
                                            senderPubKey: 0, // as after locking it cant be used for AddLock
                                            srcReceiver: msg.srcReceiver,
                                            secret: 0,
                                            hashlock: msg.hashlock,
                                            amount: ctx.value,
                                            timelock: msg.timelock,
                                            messenger: msg.messenger,
                                            redeemed: false,
                                            refunded: false
                                        });


        if(msg.messenger != self.zeroAddress && msg.Id != 0){
            // notify messenger
            send(SendParameters{to: msg.messenger,
                                bounce: true,
                                value: 20000000,
                                mode: 0,
                                body: Notify{
                                            Id: msg.Id,
                                            hashlock: msg.hashlock,
                                            dstChain: msg.dstChain,
                                            dstAsset: msg.dstAsset,
                                            dstAddress: msg.dstAddress,
                                            srcAsset: msg.srcAsset,
                                            sender: sender(),
                                            srcReceiver: msg.srcReceiver,
                                            amount: ctx.value,
                                            timelock: msg.timelock,
                                            jettonMasterAddress: self.zeroAddress,
                                            htlcJettonWalletAddress: self.zeroAddress
                                        }.toCell()});  
        }

        emit(TokenLocked{
                Id: msg.Id,
                hashlock: msg.hashlock,
                dstChain: msg.dstChain,
                dstAddress: msg.dstAddress,
                dstAsset: msg.dstAsset,
                sender: sender(),
                srcReceiver: msg.srcReceiver,
                srcAsset: msg.srcAsset,
                amount: ctx.value,
                timelock: msg.timelock,
                messenger: msg.messenger
            }.toCell());
    }

    receive(msg: Redeem) {
        require(self.contractExists(msg.Id) == true, "HTLC Does Not Exist");

        let htlc: HTLC = (self.contracts.get(msg.Id)!!);
        require(htlc.refunded == false,"Already Refunded");
        require(htlc.redeemed == false,"Already Redeemed");

        let hashlockFromSecretSlice: Slice = beginCell().storeUint(msg.secret,256).asSlice();
        let hashlockFromSecret: Int = sha256(hashlockFromSecretSlice);

        require(htlc.hashlock == hashlockFromSecret,"Hashlock Not Match");

        let contractValue: Int = htlc.amount;
        let recieverAddr: Address = htlc.srcReceiver;

        send(SendParameters{
                            to: recieverAddr,
                            bounce: false,
                            value: contractValue,
                            mode: 0
                            }); 

        send(SendParameters{
                to: sender(),
                bounce: false,
                value: 0,
                mode: 64
                });

        self.contracts.del(msg.Id);
    }

    receive(msg: Refund){
        let htlc: HTLC = self.contracts.get(msg.Id)!!;
        require(self.contractExists(msg.Id) == true,"HTLC Does Not Exist");
        require(htlc.refunded == false,"Already Refunded");
        require(htlc.redeemed == false,"Already Redeemed");
        require(htlc.timelock < now(), "Not Passed Timelock");

        // user will get exact amount he locked
        send(SendParameters{
                    to: htlc.sender,
                    bounce: false,
                    value: htlc.amount,
                    mode: 0
                });

        // tx sender will get remainig amount after msg processing
        send(SendParameters{
                    to: sender(),
                    bounce: false,
                    value: 0,
                    mode: 64
                });
        self.contracts.del(msg.Id);
    }

    get fun getDetails(Id: Int): HTLC? {
        return self.contracts.get(Id);
    }

    get fun getContractsLength(): Int {
        let length: Int = 0;
        foreach(key,value in self.contracts){
            length+=1;
        }
        return length;
    }

    get fun getContracts(senderAddr: Address): map<Int,Int>{
        let result: map<Int,Int> = emptyMap();
        let i: Int = 0;
        foreach(key,value in self.contracts){
            if(value.sender == senderAddr){
                result.set(i,key);
                i+=1;
            }
        }
        return result;
    }

    fun addLock(msg: AddLock,ctx: Context){
        require(self.contractExists(msg.Id) == true,"Commit Does Not Exist");
        let htlc: HTLC = (self.contracts.get(msg.Id)!!);

        if(ctx.sender == htlc.sender || ctx.sender == htlc.messenger){
                    require(self.contractExists(msg.Id) == true ,"Lock Already Exists");
                    require(htlc.refunded == false,"Already Refunded");
                    require(msg.timelock > now(),"Not Future Timelock");
                    require(htlc.hashlock == 0,"Hashlock Already Set");
    
                    self.contracts.set(msg.Id,HTLC{       
                                                    dstAddress: htlc.dstAddress,
                                                    dstChain: htlc.dstChain,
                                                    dstAsset: htlc.dstAsset,
                                                    srcAsset: htlc.srcAsset,
                                                    sender: htlc.sender,
                                                    senderPubKey: htlc.senderPubKey,
                                                    srcReceiver: htlc.srcReceiver,
                                                    secret: 0,
                                                    hashlock: msg.hashlock,
                                                    amount: htlc.amount,
                                                    timelock: msg.timelock,
                                                    messenger: htlc.messenger,
                                                    redeemed: false,
                                                    refunded: false
                                                    }); 

         send(SendParameters{to: sender(),
                            bounce: false,
                            value: 0,
                            mode: 64});
        }else{
            require(false,"No Allowance");
        }
    }
}
