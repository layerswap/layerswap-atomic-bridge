import "@stdlib/deploy";
//Jetton's messages
message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining; 
}

message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forward_payload: Slice as remaining;
}

message(0xd53276db) TokenExcesses {
    queryId: Int as uint64;
}

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
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;  
}

struct CommitData{
    dstChain: String;
    dstAsset: String;
    dstAddress: String;
    srcAsset: String;
    srcReceiver: Address;
    timelock: Int; 
    messenger: Address;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address; 
    senderPubKey: Int;
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>; 
}

struct LockData {
    Id: Int;
    timelock: Int;
    srcReceiver: Address;
    srcAsset: String;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    hashlock: Int;
    messenger: Address;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;  
}

// Messages received by contract
message(0x5cdd41d9) AddLock{
    Id: Int;
    hashlock: Int;
    timelock: Int;
}

message(0x758db085) Redeem {
    Id: Int;
    secret: Int;
}

message(0xad821ef9) Refund {
    Id: Int;
}

message(0xc1d818ff) AddLockSig{
    data: Slice; 
    signature: Slice;
}

// Emitted message
message(0xbf3d24d1) TokenCommitted{
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
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address; 
    senderPubKey: Int;
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>;
}

message(0x0f47e1b8) TokenLocked{
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
    hashlock: Int;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address; 
}

// String implementation as struct
struct StringImpl{
    data: String;
}

contract LayerswapV8Jetton with Deployable {
    init() {
    self.seed = random(10000000000000000000000000000000000000000000000000000000000000000000000000000,99999999999999999999999999999999999999999999999999999999999999999999999999999);
    }

    contracts: map<Int, HTLC>;
    contractNonce: Int = 0;
    seed: Int;
    zeroAddress: Address = newAddress(0,0x0);


    fun contractExists(Id: Int): Bool {
        if(self.contracts.get(Id) == null){
            return false;
        }
        return true;
    }

    receive(msg: TokenNotification){
        let ctx: Context = context();

        let slice = msg.forward_payload.asCell().beginParse(); 
        let flag = slice.loadUint(1);  
        let refCell = slice.loadRef();  
        let refSlice = refCell.beginParse();
        let op_code = refSlice.loadUint(32);  

        if (op_code == 1734998782){
            self._commit(refSlice, msg.from,msg.amount);
        }
        if (op_code == 317164721){
            self._lock(refSlice, msg.from,msg.amount);
        }
    }

    fun _commit(msgSlc: Slice,sender: Address,value: Int){
            let msg: CommitData = CommitData.fromSlice(msgSlc);

            require(value != 0,"Funds Not Sent");
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
                                                sender: sender,
                                                senderPubKey: msg.senderPubKey,
                                                srcReceiver: msg.srcReceiver,
                                                secret: 0,
                                                hashlock: 0,
                                                amount: value,
                                                timelock: msg.timelock, 
                                                messenger: msg.messenger,
                                                redeemed: false,
                                                refunded: false,
                                                jettonMasterAddress: msg.jettonMasterAddress,
                                                htlcJettonWalletAddress: msg.htlcJettonWalletAddress
                                                });

            emit(TokenCommitted{
                                Id: Id,
                                dstChain: msg.dstChain,
                                dstAddress: msg.dstAddress,
                                dstAsset: msg.dstAsset,
                                sender: sender,
                                srcReceiver: msg.srcReceiver,
                                srcAsset: msg.srcAsset,
                                amount: value,
                                timelock: msg.timelock, 
                                messenger: msg.messenger,
                                jettonMasterAddress: msg.jettonMasterAddress,
                                htlcJettonWalletAddress: msg.htlcJettonWalletAddress,
                                senderPubKey: msg.senderPubKey,
                                hopChains: msg.hopChains,
                                hopAssets: msg.hopAssets,
                                hopAddresses: msg.hopAddresses
                            }.toCell());
    }

     fun _lock(msgSlc: Slice,sender: Address,value: Int){
        let msg: LockData = LockData.fromSlice(msgSlc);
        require(now() < msg.timelock ,"Not Future Timelock");
        require(value != 0,"Funds Not Sent");
        require(self.contractExists(msg.Id) == false,"Contract Already Exists");

        self.contracts.set(msg.Id,  HTLC  {
                                                        dstAddress: msg.dstAddress,
                                                        dstChain: msg.dstChain,
                                                        dstAsset: msg.dstAsset,
                                                        srcAsset: msg.srcAsset,
                                                        sender: sender,
                                                        senderPubKey: 0,
                                                        srcReceiver: msg.srcReceiver,
                                                        secret: 0,
                                                        hashlock: msg.hashlock,
                                                        amount: value, 
                                                        timelock: msg.timelock,
                                                        messenger: msg.messenger,
                                                        redeemed: false,
                                                        refunded: false,
                                                        jettonMasterAddress: msg.jettonMasterAddress,
                                                        htlcJettonWalletAddress: msg.htlcJettonWalletAddress
                                                        });

        if(msg.messenger != self.zeroAddress && msg.Id != 0){
            send(SendParameters{to: msg.messenger,
                                bounce: true,
                                value: 20000000,
                                mode: 0,
                                body: Notify {
                                                Id: msg.Id,
                                                hashlock: msg.hashlock,
                                                dstChain: msg.dstChain,
                                                dstAsset: msg.dstAsset,
                                                dstAddress: msg.dstAddress,
                                                srcAsset: msg.srcAsset,
                                                sender: sender,
                                                srcReceiver: msg.srcReceiver,
                                                amount: value,
                                                timelock: msg.timelock,
                                                jettonMasterAddress: msg.jettonMasterAddress,
                                                htlcJettonWalletAddress: msg.htlcJettonWalletAddress  
                                            }.toCell()});  
        }

        emit(TokenLocked{
                        Id: msg.Id,
                        dstChain: msg.dstChain,
                        dstAddress: msg.dstAddress,
                        dstAsset: msg.dstAddress,
                        sender: sender,
                        srcReceiver: msg.srcReceiver,
                        srcAsset: msg.srcAsset,
                        amount: value,
                        timelock: msg.timelock,
                        messenger: msg.messenger,
                        hashlock: msg.hashlock,
                        jettonMasterAddress: msg.jettonMasterAddress,
                        htlcJettonWalletAddress: msg.htlcJettonWalletAddress
                    }.toCell());
    }

    receive(msg: AddLock){
        require(self.contractExists(msg.Id) == true ,"Contract Does Not Exist");
        let htlc: HTLC = (self.contracts.get(msg.Id)!!);
        require(sender() == htlc.sender || sender() == htlc.messenger,"No Allowance");
        self.addLock(msg.Id,msg.hashlock,msg.timelock,context());
    }

    receive(msg: AddLockSig){
        require(self.contractExists(msg.data.preloadInt(257)) == true ,"Contract Does Not Exist");
        let htlc: HTLC = (self.contracts.get(msg.data.preloadInt(257))!!);
        require(checkSignature(msg.data.hash(),msg.signature,htlc.senderPubKey),"Invalid signature");

        let Id: Int = msg.data.loadInt(257);
        let hashlock: Int = msg.data.loadInt(257);
        let timelock: Int = msg.data.loadInt(257);
        let ctx: Context = context();
        self.addLock(Id,hashlock,timelock,ctx);
    }

    receive(msg: Redeem) {
        let ctx: Context = context();

        require(self.contractExists(msg.Id) == true, "Contract Does Not Exist");
        let htlc: HTLC = (self.contracts.get(msg.Id)!!);

        let hashlockFromSecretSlice: Slice = beginCell().storeUint(msg.secret,256).asSlice();
        let hashlockFromSecret: Int = sha256(hashlockFromSecretSlice);
        require(htlc.hashlock == hashlockFromSecret,"Hashlock Not Match");

        //these checks can be skipped as after modification HTLC object is deleted
        require(htlc.refunded == false,"Already Refunded");
        require(htlc.redeemed == false,"Already Redeemed");

        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                            to: htlc.htlcJettonWalletAddress,
                            value: ctx.value,
                            bounce: true,
                            mode: 0,
                            body: TokenTransfer {
                                                queryId: queryIndex,
                                                amount: htlc.amount,
                                                destination: htlc.srcReceiver,
                                                response_destination: sender(),
                                                custom_payload: null,
                                                forward_ton_amount: 1,
                                                forward_payload: ("Redeemed").asSlice(), 
                                            }.toCell(),                                
            }
        ); 
        self.contracts.del(msg.Id);
    }

    receive(msg: Refund){
        let ctx: Context = context();
        require(self.contractExists(msg.Id) == true,"Contract Does Not Exist");
        let htlc: HTLC = (self.contracts.get(msg.Id)!!);
        require(htlc.timelock < now(), "Not Passed Timelock");
        //these checks can be skipped as after modification HTLC object is deleted
        require(htlc.refunded == false,"Already Refunded");
        require(htlc.redeemed == false,"Already Redeemed");

        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                    to: htlc.htlcJettonWalletAddress,
                    value: ctx.value,
                    bounce: true,
                    mode: 0,
                    body: TokenTransfer {
                                        queryId: queryIndex,
                                        amount: htlc.amount,
                                        destination: htlc.sender,
                                        response_destination: sender(),
                                        custom_payload: null,
                                        forward_ton_amount: 1,
                                        forward_payload: ("Refunded").asSlice(),
                                    }.toCell(),                            
                }
        );
        self.contracts.del(msg.Id);
    }

    receive(msg: TokenExcesses){}

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

    fun addLock(Id: Int,hashlock: Int, timelock: Int,ctx: Context){
        require(self.contractExists(Id) == true,"Contract Does Not Exist");
        let htlc: HTLC = (self.contracts.get(Id)!!);
                    require(htlc.hashlock == 0,"Hashlock Already Set");
                    require(timelock > now(),"Not Future Timelock");
                    // these checks can be skipped as commit object after Refund is deleted and Redeem can be called if anyone knows M s.t. sha256(M) = 0
                    require(htlc.redeemed == false,"Already Redeemed");
                    require(htlc.refunded == false,"Already Refunded");
    
                    self.contracts.set(Id,HTLC{       
                                                    dstAddress: htlc.dstAddress,
                                                    dstChain: htlc.dstChain,
                                                    dstAsset: htlc.dstAsset,
                                                    srcAsset: htlc.srcAsset,
                                                    sender: htlc.sender,
                                                    senderPubKey: htlc.senderPubKey,
                                                    srcReceiver: htlc.srcReceiver,
                                                    secret: 0, 
                                                    hashlock: hashlock,
                                                    amount: htlc.amount,
                                                    timelock: timelock,
                                                    messenger: htlc.messenger,
                                                    redeemed: false,
                                                    refunded: false,
                                                    jettonMasterAddress: htlc.jettonMasterAddress,
                                                    htlcJettonWalletAddress: htlc.htlcJettonWalletAddress
                                                   }); 

        send(SendParameters{to: sender(),
                            bounce: false,
                            value: 0,
                            mode: 64});
    }
}
