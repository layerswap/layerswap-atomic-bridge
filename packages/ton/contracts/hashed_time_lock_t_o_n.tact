import "@stdlib/deploy";
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
}

message LockCommitment{
    data: LockCommitmentData;
}
struct LockCommitmentData{
    commitId: Int;
    hashlock: Int;
    timelock: Int;
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

    receive(msg: Commit){
            let ctx: Context = context();

            require(ctx.value != 0,"Funds Not Sent");
            require(msg.data.timelock > now(),"Not Future Timelock");
            self.contractNonce +=1;
            let commitId: Int = self.seed ^ self.contractNonce; 

            require(self.commitExists(commitId) == false,"Commit Already Exists");
            self.commits.set(commitId, PHTLC {
                                                dstAddress: msg.data.dstAddress,
                                                dstChain: msg.data.dstChain,
                                                dstAsset: msg.data.dstAsset,
                                                srcAsset: msg.data.srcAsset,
                                                sender: ctx.sender,
                                                srcReceiver: msg.data.srcReceiver,
                                                timelock: msg.data.timelock, 
                                                amount: ctx.value,
                                                messenger: msg.data.messenger,
                                                locked: false,
                                                uncommitted: false
                                                });
            emit(CommitId {commitId: commitId}.toCell());
    }

    receive(msg: Uncommit){
        require(self.commitExists(msg.data.commitId) == true,"Commit Does Not Exist");
        let commitObj: PHTLC = (self.commits.get(msg.data.commitId)!!);

        require(commitObj.uncommitted == false,"Already Uncommitted");
        require(commitObj.locked == false,"Already Locked");
        require(commitObj.timelock <= now(),"Not Passed Timelock");

        let ctx: Context = context();

        send(SendParameters{to: commitObj.sender,
                            bounce: true,
                            value: commitObj.amount + ctx.value,
                            mode: 64}); 

        self.commits.del(msg.data.commitId);
    }

    receive(msg: LockCommitment){
        let ctx: Context = context();
        let lockId: Int = msg.data.hashlock;
        require(self.commitExists(msg.data.commitId) == true,"Commit Does Not Exist");
        let commitObj: PHTLC = (self.commits.get(msg.data.commitId)!!);

        if(ctx.sender == commitObj.sender || ctx.sender == commitObj.messenger){
                    require(self.lockExists(lockId) == false ,"Lock Already Exists");
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
                                                    timelock: msg.data.timelock,
                                                    redeemed: false,
                                                    unlocked: false
                                                   }); 

                    self.commits.del(msg.data.commitId);

                    send(SendParameters{to: ctx.sender,
                                        bounce: true,
                                        value: ctx.value,
                                        mode: 64});
                                    
        }else{
            require(false,"No Allowance");
        }
    }

    receive(msg: Lock){ 
        let ctx: Context = context();
        require(self.lockExists(msg.data.hashlock) == false,"Lock Already Exists"); 
        require(now() <= msg.data.timelock ,"Not Future Timelock");
        require(ctx.value != 0,"Funds Not Sent");

        self.locks.set(msg.data.hashlock,  HTLC  {
                                                        dstAddress: msg.data.dstAddress,
                                                        dstChain: msg.data.dstChain,
                                                        dstAsset: msg.data.dstAsset,
                                                        srcAsset: msg.data.srcAsset,
                                                        sender: sender(),
                                                        srcReceiver: msg.data.srcReceiver,
                                                        hashlock: msg.data.hashlock,
                                                        secret: 0x0,
                                                        amount: ctx.value,
                                                        timelock: msg.data.timelock,
                                                        redeemed: false,
                                                        unlocked: false
                                                        });

        if(msg.data.commitId != null){
            let id: Int = msg.data.commitId!!;
            self.commitIdToLockId.set(id,msg.data.hashlock);
        }

        if(msg.data.messenger != null && msg.data.commitId != null){
            send(SendParameters{to: msg.data.messenger!!,
                                bounce: true,
                                value: 20000000,
                                mode: 0,
                                body: Notify {data: Notification {
                                                                            commitId: msg.data.commitId!!,
                                                                            hashlock: msg.data.hashlock,
                                                                            dstChain: msg.data.dstChain,
                                                                            dstAsset: msg.data.dstAsset,
                                                                            dstAddress: msg.data.dstAddress,
                                                                            srcAsset: msg.data.srcAsset,
                                                                            sender: sender(),
                                                                            srcReceiver: msg.data.srcReceiver,
                                                                            amount: ctx.value,
                                                                            timelock: msg.data.timelock,
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
        require(lockObj.unlocked == false,"Already Unlocked");
        require(lockObj.redeemed == false,"Already Redeemed");

        let contractValue: Int = lockObj.amount;
        let recieverAddr: Address = lockObj.srcReceiver;

        if(recieverAddr == sender()){
            send(SendParameters{
                    to: sender(),
                    bounce: true,
                    value: contractValue + ctx.value,
                    mode: 64
                    }); 
        }else{
            send(SendParameters{
                    to: recieverAddr,
                    bounce: true,
                    value: contractValue,
                    mode: 0
                    }); 

            send(SendParameters{
                    to: sender(),
                    bounce: true,
                    value: ctx.value,
                    mode: 64
                    });
        }  

        self.locks.del(msg.data.lockId);
    }

    receive(msg: Unlock){
        let ctx: Context = context();
        let lock: HTLC = self.locks.get(msg.data.hashlock)!!;
        require(self.lockExists(msg.data.hashlock) == true,"Lock Does Not Exist");
        require(lock.unlocked == false,"Already Unlocked");
        require(lock.redeemed == false,"Already Redeemed");
        require(lock.timelock < now(), "Not Passed Timelock");
            
        if(lock.sender == ctx.sender){
            send(SendParameters{
                                to: ctx.sender,
                                bounce: true,
                                value: lock.amount + ctx.value,
                                mode: 64
                            });
        }else{
            send(SendParameters{
                    to: lock.sender,
                    bounce: true,
                    value: lock.amount,
                    mode: 0
                });
            send(SendParameters{
                    to: ctx.sender,
                    bounce: true,
                    value: ctx.value,
                    mode: 64
                });
        }

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



