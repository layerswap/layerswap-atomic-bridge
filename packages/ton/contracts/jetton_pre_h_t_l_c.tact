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
    htlcJettonWalletAddress: Slice;  
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
    htlcJettonWalletAddress: Slice;  
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
    htlcJettonWalletAddress: Slice;  
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
    htlcJettonWalletAddress: Slice;  
}

// Messages received by contract
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

message Redeem {
    data: RedeemData;
}
struct RedeemData {
    lockId: Int;
    secret: Int;
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

        let slice = msg.forward_payload.asCell().beginParse(); 
        let flag = slice.loadUint(1);  
        let refCell = slice.loadRef();  
        let refSlice = refCell.beginParse();
        let op_code = refSlice.loadUint(32);  

        if (op_code == 1734998782){
            self._commit(refSlice, msg.from,msg.amount);
        }
        if (op_code == 3995289619){
            self._lock(refSlice, msg.from,msg.amount);
        }
    }

    fun _commit(msgSlc: Slice,sender: Address,value: Int){
            let msg: CommitData = CommitData.fromSlice(msgSlc);

            require(value != 0,"Funds Not Sent");
            require(msg.timelock > now(),"Not Future Timelock");
            self.contractNonce +=1;
            let commitId: Int = self.seed ^ self.contractNonce; 

            require(self.commitExists(commitId) == false,"Commit Already Exists");
            self.commits.set(commitId, PHTLC {
                                                dstAddress: msg.dstAddress,
                                                dstChain: msg.dstChain,
                                                dstAsset: msg.dstAsset,
                                                srcAsset: msg.srcAsset,
                                                sender: sender,
                                                srcReceiver: msg.srcReceiver,
                                                timelock: msg.timelock, 
                                                amount: value,
                                                messenger: msg.messenger,
                                                locked: false,
                                                uncommitted: false,
                                                jettonMasterAddress: msg.jettonMasterAddress,
                                                htlcJettonWalletAddress: msg.htlcJettonWalletAddress
                                                });
            emit(CommitId {commitId: commitId}.toCell());
    }

    receive(msg: Uncommit){
        require(self.commitExists(msg.data.commitId) == true,"Commit Does Not Exist");
        let commitObj: PHTLC = (self.commits.get(msg.data.commitId)!!);
        require(commitObj.timelock <= now(),"Not Passed Timelock");
        //these checks can be skipped as after modification PHTLC object is deleted
        require(commitObj.uncommitted == false,"Already Uncommitted");
        require(commitObj.locked == false,"Already Locked");

        let ctx: Context = context();
        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                to: commitObj.htlcJettonWalletAddress.loadAddress(),
                value: ctx.value,
                bounce: true,
                mode: 0,
                body: TokenTransfer {
                                    queryId: queryIndex,
                                    amount: commitObj.amount,
                                    destination: commitObj.sender,
                                    response_destination: myAddress(),
                                    custom_payload: null,
                                    forward_ton_amount: 1,
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
        let commitObj: PHTLC = (self.commits.get(msg.data.commitId)!!);

        if(ctx.sender == commitObj.sender || ctx.sender == commitObj.messenger){
                    require(self.lockExists(lockId) == false ,"Lock Already Exists");
                    // these checks can be skipped as commit object after modification(uncommit or lockCommitment) is deleted
                    require(commitObj.locked == false,"Already Locked");
                    require(commitObj.uncommitted == false,"Already Uncommitted");
    
                    self.locks.set(lockId,HTLC{       
                                                    dstAddress: commitObj.dstAddress,
                                                    dstChain: commitObj.dstChain,
                                                    dstAsset: commitObj.dstAsset,
                                                    srcAsset: commitObj.srcAsset,
                                                    sender: commitObj.sender,
                                                    srcReceiver: commitObj.srcReceiver,
                                                    hashlock: msg.data.hashlock,
                                                    secret: 0x0,
                                                    amount: commitObj.amount,
                                                    timelock: commitObj.timelock,
                                                    redeemed: false,
                                                    unlocked: false,
                                                    jettonMasterAddress: commitObj.jettonMasterAddress,
                                                    htlcJettonWalletAddress: commitObj.htlcJettonWalletAddress
                                                   }); 

                    self.commits.del(msg.data.commitId);
        }else{
            require(false,"No Allowance");
        }
    }

    fun _lock(msgSlc: Slice,sender: Address,value: Int){
        let msg: LockData = LockData.fromSlice(msgSlc);
        require(self.lockExists(msg.hashlock) == false,"Lock Already Exists"); 
        require(now() <= msg.timelock ,"Not Future Timelock");
        require(value != 0,"Funds Not Sent");

        self.locks.set(msg.hashlock,  HTLC  {
                                                        dstAddress: msg.dstAddress,
                                                        dstChain: msg.dstChain,
                                                        dstAsset: msg.dstAsset,
                                                        srcAsset: msg.srcAsset,
                                                        sender: sender,
                                                        srcReceiver: msg.srcReceiver,
                                                        hashlock: msg.hashlock,
                                                        secret: 0x0,
                                                        amount: value, 
                                                        timelock: msg.timelock,
                                                        redeemed: false,
                                                        unlocked: false,
                                                        jettonMasterAddress: msg.jettonMasterAddress,
                                                        htlcJettonWalletAddress: msg.htlcJettonWalletAddress
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
                                                                            sender: sender,
                                                                            srcReceiver: msg.srcReceiver,
                                                                            amount: value,
                                                                            timelock: msg.timelock,
                                                                        }}.toCell()});  
        }
    }

    receive(msg: Redeem) {
        let ctx: Context = context();

        require(self.lockExists(msg.data.lockId) == true, "Lock Does Not Exist");
        let lockObj: HTLC = (self.locks.get(msg.data.lockId)!!);

        let hashlockFromSecretSlice: Slice = beginCell().storeUint(msg.data.secret,256).asSlice();
        let hashlockFromSecret: Int = sha256(hashlockFromSecretSlice);
        require(lockObj.hashlock == hashlockFromSecret,"Hashlock Not Match");

        //these checks can be skipped as after modification HTLC object is deleted
        require(lockObj.unlocked == false,"Already Unlocked");
        require(lockObj.redeemed == false,"Already Redeemed");

        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                            to: lockObj.htlcJettonWalletAddress.loadAddress(),
                            value: ctx.value,
                            bounce: true,
                            mode: 0,
                            body: TokenTransfer {
                                                queryId: queryIndex,
                                                amount: lockObj.amount,
                                                destination: lockObj.srcReceiver,
                                                response_destination: sender(),
                                                custom_payload: null,
                                                forward_ton_amount: 1,
                                                forward_payload: ("Redeemed").asSlice(), 
                                            }.toCell(),                                
            }
        ); 
        self.locks.del(msg.data.lockId);
    }

    receive(msg: Unlock){
        let ctx: Context = context();
        require(self.lockExists(msg.data.hashlock) == true,"Lock Does Not Exist");
        let lockObj: HTLC = (self.locks.get(msg.data.hashlock)!!);
        require(lockObj.timelock < now(), "Not Passed Timelock");
        //these checks can be skipped as after modification HTLC object is deleted
        require(lockObj.unlocked == false,"Already Unlocked");
        require(lockObj.redeemed == false,"Already Redeemed");

        let queryHash: Int = beginCell().storeAddress(ctx.sender).storeInt(now(),48).endCell().hash();
        let queryIndex: Int =  (0x000000000000000 & queryHash);

        send(SendParameters{
                    to: lockObj.htlcJettonWalletAddress.loadAddress(),
                    value: ctx.value,
                    bounce: true,
                    mode: 0,
                    body: TokenTransfer {
                                        queryId: queryIndex,
                                        amount: lockObj.amount,
                                        destination: lockObj.sender,
                                        response_destination: sender(),
                                        custom_payload: null,
                                        forward_ton_amount: 1,
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
