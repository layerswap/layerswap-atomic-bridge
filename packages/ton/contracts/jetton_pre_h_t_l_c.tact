import "@stdlib/deploy";
//Jetton's messages
message(0xf8a7ea5) TokenTransfer {
    queryId: Int as uint64;
    amount: Int as coins;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell?;
    forward_ton_amount: Int as coins;
    forward_payload: Slice as remaining; // Comment Text message when Transfer the jetton
}

message(0x7362d09c) TokenNotification {
    queryId: Int as uint64;
    amount: Int as coins;
    from: Address;
    forward_payload: Slice as remaining; // Comment Text message when Transfer the jetton 
}

// Messenger notification
struct Notification {
    commitId: Int;
    hashlock: Int;
    dstChain: String;
    dstAsset: String;
    dstAddress: String;
    srcAsset: String;
    sender: Address;
    srcReceiver: Address;
    amount: Int;
    timelock: Int;
}

message Notify {
    data: Notification;
}

// Commitment object
struct PHTLC {
    dstAddress: String;
    dstChain: String;
    dstAsset: String;
    srcAsset: String;
    sender: Address;
    srcReceiver: Address;
    timelock: Int; 
    amount: Int;
    messenger: Address;
    locked: Bool;
    uncommitted: Bool;
    jettonMasterAddress: Slice;
    jettonWalletCode: Slice;
}

// Lock object
struct HTLC {
    dstAddress: String;
    dstChain: String;
    dstAsset: String;
    srcAsset: String;
    sender: Address;
    srcReceiver: Address;
    hashlock: Int;
    secret: Int;
    amount: Int;
    timelock: Int;
    redeemed: Bool;
    unlocked: Bool;
    jettonMasterAddress: Slice;
    jettonWalletCode: Slice;
}

// Messages received by contract
message Commit{
    data: CommitData;
}
struct CommitData{
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>;
    dstChain: String;
    dstAsset: String;
    dstAddress: String;
    srcAsset: String;
    srcReceiver: Address;
    timelock: Int; 
    messenger: Address;
    jettonMasterAddress: Slice;
    jettonWalletCode: Slice;  
    amount: Int; 
}

message LockCommitment{
    data: LockCommitmentData;
}
struct LockCommitmentData{
    commitId: Int;
    hashlock: Int;
}

message Uncommit{
    data: UncommitData;
}
struct UncommitData{
    commitId: Int;
}

message Lock {
    data: LockData;
}
struct LockData {
    hashlock: Int;
    timelock: Int;
    srcReceiver: Address;
    srcAsset: String;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    commitId: Int?;
    messenger: Address?;
    jettonMasterAddress: Slice;
    jettonWalletCode: Slice;
}

message Redeem {
    data: RedeemData;
}
struct RedeemData {
    lockId: Int;
    secret: Int;
    initCode: Cell?; // check if data can be gained off chain
    initData: Cell?;
}

message Unlock {
    data: UnlockData;
}
struct UnlockData {
    hashlock: Int;
}

// Emitted message
message CommitId {
    commitId: Int;
}

// String implementation as struct
struct StringImpl{
    data: String;
}

contract HashedTimeLockTON with Deployable {
    init() {
    self.seed = random(10000000000000000000000000000000000000000000000000000000000000000000000000000,99999999999999999999999999999999999999999999999999999999999999999999999999999);
    }

    locks: map<Int, HTLC> ;
    commits: map<Int, PHTLC>;
    commitIdToLockId: map<Int,Int>;
    contractNonce: Int = 0;
    seed: Int;

    fun lockExists(hashlock: Int): Bool {
        if(self.locks.get(hashlock) == null){
            return false;
        }
        return true;
    }

    fun commitExists(commitId: Int): Bool {
        if(self.commits.get(commitId) == null){
            return false;
        }
        return true;
    }

    receive(msg: TokenNotification){
        let ctx: Context = context();
        let data: Slice = msg.forward_payload.loadRef().asSlice();
        let op_code: Int = data.asSlice().preloadUint(32);
        
        if (op_code == 1734998782){
            self._commit(CommitData.fromSlice(data), ctx);
        }
        // if (op_code == 3995289619){
        //     self._lock(LockData.fromSlice(msg.forward_payload), ctx);
        // }
    }

    fun _commit(msg: CommitData,ctx: Context){
            require(ctx.value != 0,"Funds Not Sent");
            require(msg.timelock > now(),"Not Future Timelock");
            self.contractNonce +=1;
            let commitId: Int = self.seed ^ self.contractNonce; 

            require(self.commitExists(commitId) == false,"Commit Already Exists");
            self.commits.set(commitId, PHTLC {
                                                dstAddress: msg.dstAddress,
                                                dstChain: msg.dstChain,
                                                dstAsset: msg.dstAsset,
                                                srcAsset: msg.srcAsset,
                                                sender: ctx.sender,
                                                srcReceiver: msg.srcReceiver,
                                                timelock: msg.timelock, 
                                                amount: msg.amount,
                                                messenger: msg.messenger,
                                                locked: false,
                                                uncommitted: false,
                                                jettonMasterAddress: msg.jettonMasterAddress,
                                                jettonWalletCode: msg.jettonWalletCode
                                                });
            emit(CommitId {commitId: commitId}.toCell());
    
    }

    receive(msg: Uncommit){
        require(self.commitExists(msg.data.commitId) == true,"Commit Does Not Exist");
        require((self.commits.get(msg.data.commitId)!!).uncommitted == false,"Already Uncommitted");
        require((self.commits.get(msg.data.commitId)!!).locked == false,"Already Locked");
        require((self.commits.get(msg.data.commitId)!!).timelock <= now(),"Not Passed Timelock");

        let ctx: Context = context();
        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                to: calculateUserJettonWalletAddress(myAddress().asSlice(),(self.commits.get(msg.data.commitId)!!).jettonMasterAddress,(self.commits.get(msg.data.commitId)!!).jettonWalletCode.asCell()).loadAddress(),
                value: ctx.value/2,
                bounce: true,
                mode: 0,
                body: TokenTransfer {
                                    queryId: queryIndex,
                                    amount: (self.commits.get(msg.data.commitId)!!).amount,
                                    destination: (self.commits.get(msg.data.commitId)!!).sender,
                                    response_destination: myAddress(),
                                    custom_payload: null,
                                    forward_ton_amount: ctx.value/2,
                                    forward_payload: ("Uncommitted").asSlice(), 
                                }.toCell(),
            }
        );

        self.commits.del(msg.data.commitId);
    }

    receive(msg: LockCommitment){
        let ctx: Context = context();
        let lockId: Int = msg.data.hashlock;
        require(self.commitExists(msg.data.commitId) == true,"Commit Does Not Exist");
        
        if(ctx.sender == (self.commits.get(msg.data.commitId)!!).sender || ctx.sender == (self.commits.get(msg.data.commitId)!!).messenger){
                    require(self.lockExists(lockId) == false ,"Lock Already Exists");
                    require((self.commits.get(msg.data.commitId)!!).locked == false,"Already Locked");
                    require((self.commits.get(msg.data.commitId)!!).uncommitted == false,"Already Uncommitted");
    
                    self.locks.set(lockId,HTLC{       
                                                    dstAddress: (self.commits.get(msg.data.commitId)!!).dstAddress,
                                                    dstChain: (self.commits.get(msg.data.commitId)!!).dstChain,
                                                    dstAsset: (self.commits.get(msg.data.commitId)!!).dstAsset,
                                                    srcAsset: (self.commits.get(msg.data.commitId)!!).srcAsset,
                                                    sender: (self.commits.get(msg.data.commitId)!!).sender,
                                                    srcReceiver: (self.commits.get(msg.data.commitId)!!).srcReceiver,
                                                    hashlock: msg.data.hashlock,
                                                    secret: 0x0,
                                                    amount: (self.commits.get(msg.data.commitId)!!).amount,
                                                    timelock: (self.commits.get(msg.data.commitId)!!).timelock,
                                                    redeemed: false,
                                                    unlocked: false,
                                                    jettonMasterAddress: (self.commits.get(msg.data.commitId)!!).jettonMasterAddress,
                                                    jettonWalletCode: (self.commits.get(msg.data.commitId)!!).jettonWalletCode
                                                   }); 

                    self.commits.del(msg.data.commitId);
        }else{
            require(false,"No Allowance");
        }
    }

    fun _lock(msg: LockData,ctx: Context){
        require(self.lockExists(msg.hashlock) == false,"Lock Already Exists"); 
        require(now() <= msg.timelock ,"Not Future Timelock");
        require(ctx.value != 0,"Funds Not Sent");

        self.locks.set(msg.hashlock,  HTLC  {
                                                        dstAddress: msg.dstAddress,
                                                        dstChain: msg.dstChain,
                                                        dstAsset: msg.dstAsset,
                                                        srcAsset: msg.srcAsset,
                                                        sender: sender(),
                                                        srcReceiver: msg.srcReceiver,
                                                        hashlock: msg.hashlock,
                                                        secret: 0x0,
                                                        amount: ctx.value, 
                                                        timelock: msg.timelock,
                                                        redeemed: false,
                                                        unlocked: false,
                                                        jettonMasterAddress: msg.jettonMasterAddress,
                                                        jettonWalletCode: msg.jettonWalletCode
                                                        });

        if(msg.commitId != null){
            let id: Int = msg.commitId!!;
            self.commitIdToLockId.set(id,msg.hashlock);
        }

        if(msg.messenger != null && msg.commitId != null){
            send(SendParameters{to: msg.messenger!!,
                                bounce: true,
                                value: 20000000,
                                mode: 0,
                                body: Notify {data: Notification {
                                                                            commitId: msg.commitId!!,
                                                                            hashlock: msg.hashlock,
                                                                            dstChain: msg.dstChain,
                                                                            dstAsset: msg.dstAsset,
                                                                            dstAddress: msg.dstAddress,
                                                                            srcAsset: msg.srcAsset,
                                                                            sender: sender(),
                                                                            srcReceiver: msg.srcReceiver,
                                                                            amount: ctx.value,
                                                                            timelock: msg.timelock,
                                                                        }}.toCell()});  
        }
    }

    receive(msg: Redeem) {
        let ctx: Context = context();
        require(self.lockExists(msg.data.lockId) == true, "Lock Does Not Exist");

        let hashlockFromSecretSlice: Slice = beginCell().storeUint(msg.data.secret,256).asSlice();
        let hashlockFromSecret: Int = sha256(hashlockFromSecretSlice);

        require((self.locks.get(msg.data.lockId)!!).hashlock == hashlockFromSecret,"Hashlock Not Match");
        require((self.locks.get(msg.data.lockId)!!).unlocked == false,"Already Unlocked");
        require((self.locks.get(msg.data.lockId)!!).redeemed == false,"Already Redeemed");

        let contractValue: Int = (self.locks.get(msg.data.lockId)!!).amount;
        let recieverAddr: Address = (self.locks.get(msg.data.lockId)!!).srcReceiver;

        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                            to: calculateUserJettonWalletAddress((self.locks.get(msg.data.lockId)!!).srcReceiver.asSlice(),(self.locks.get(msg.data.lockId)!!).jettonMasterAddress,(self.locks.get(msg.data.lockId)!!).jettonWalletCode.asCell()).loadAddress(),
                            value: ctx.value/2,
                            bounce: true,
                            mode: 0,
                            body: TokenTransfer {
                                                queryId: queryIndex,
                                                amount: (self.locks.get(msg.data.lockId)!!).amount,
                                                destination: (self.locks.get(msg.data.lockId)!!).srcReceiver,
                                                response_destination: myAddress(),
                                                custom_payload: null,
                                                forward_ton_amount: ctx.value/2,
                                                forward_payload: ("Redeemed").asSlice(), 
                                            }.toCell(),
                            code: msg.data.initCode,
                            data: msg.data.initData,                                 
            }
        ); 

        self.locks.del(msg.data.lockId);
    }

    receive(msg: Unlock){
        let ctx: Context = context();
        require(self.lockExists(msg.data.hashlock) == true,"Lock Does Not Exist");
        require((self.locks.get(msg.data.hashlock)!!).unlocked == false,"Already Unlocked");
        require((self.locks.get(msg.data.hashlock)!!).redeemed == false,"Already Redeemed");
        require((self.locks.get(msg.data.hashlock)!!).timelock < now(), "Not Passed Timelock");

        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                    to: calculateUserJettonWalletAddress((self.locks.get(msg.data.hashlock)!!).sender.asSlice(),(self.locks.get(msg.data.hashlock)!!).jettonMasterAddress,(self.locks.get(msg.data.hashlock)!!).jettonWalletCode.asCell()).loadAddress(),
                    value: ctx.value/2,
                    bounce: true,
                    mode: 0,
                    body: TokenTransfer {
                                        queryId: queryIndex,
                                        amount: (self.locks.get(msg.data.hashlock)!!).amount,
                                        destination: (self.locks.get(msg.data.hashlock)!!).sender,
                                        response_destination: myAddress(),
                                        custom_payload: null,
                                        forward_ton_amount: ctx.value/2,
                                        forward_payload: ("Unlocked").asSlice(),
                                    }.toCell(),                            
                }
        );

        self.locks.del(msg.data.hashlock);
    }

    get fun getLockCDetails(hashlock: Int): HTLC? {
        return self.locks.get(hashlock);
    }

    get fun getCommitDetails(commitId: Int): PHTLC?{
        return self.commits.get(commitId);
    }

    get fun commitsLength(): Int {
        let length: Int = 0;
        foreach(key,value in self.commits){
            length+=1;
        }
        return length;
    }

    get fun locksLength(): Int {
        let length: Int = 0;
        foreach(key,value in self.locks){
            length+=1;
        }
        return length;
    }

    get fun lockIdToCommitIdLength(): Int{
        let length: Int = 0;
        foreach(key,value in self.commitIdToLockId){
            length+=1;
        }
        return length;
    }

    get fun getCommits(senderAddr: Address): map<Int,Int>{
        let result: map<Int,Int> = emptyMap();
        let i: Int = 0;
        foreach(key,value in self.commits){
            if(value.sender == senderAddr){
                result.set(i,key);
                i+=1;
            }
        }
        return result;
    }

    get fun getLocks(senderAddr: Address): map<Int,Int>{
        let result: map<Int,Int> = emptyMap();
        let i: Int = 0;
        foreach(key,value in self.locks){
            if(value.sender == senderAddr){
                result.set(i,key);
                i+=1;
            }
        }
        return result;
    }

    get fun getLockIdByCommitId(commitId: Int): Int?{
        foreach(key,value in self.commitIdToLockId){
            if(key == commitId){
                return value;
            }
        }
        return null;
    }

}

fun packJettonWalletData(balance: Int, ownerAddress: Slice, jettonMasterAddress: Slice, jettonWalletCode: Cell): Cell {
   return  beginCell()
            .storeCoins(balance)
            .storeSlice(ownerAddress)
            .storeSlice(jettonMasterAddress)
            .storeRef(jettonWalletCode)
           .endCell();
}

fun calculateJettonWalletStateInit(balance: Int, ownerAddress: Slice, jettonMasterAddress: Slice, jettonWalletCode: Cell): Cell{
      return beginCell()          
          .storeUint(0, 2)
          .storeRef(jettonWalletCode)
          .storeRef(packJettonWalletData(0, ownerAddress, jettonMasterAddress, jettonWalletCode))
          .storeUint(0, 1)
         .endCell();
}

fun calculateJettonWalletAddress( stateInit: Cell): Slice{
      return beginCell().storeUint(4, 3)
                     .storeInt(0, 8)
                     .storeUint(stateInit.hash(), 256)
                     .endCell()
                     .beginParse();
}

fun calculateUserJettonWalletAddress(ownerAddress: Slice, jettonMasterAddress: Slice, jettonWalletCode: Cell): Slice{
  return calculateJettonWalletAddress(calculateJettonWalletStateInit(0,ownerAddress, jettonMasterAddress, jettonWalletCode));
}

