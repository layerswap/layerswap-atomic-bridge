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

message(0x3beb51c2) Notify {
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
message(0x1b564d91) Commit{
    data: CommitData;
}
struct CommitData{
    dstChain: String;
    dstAsset: String;
    dstAddress: String;
    srcAsset: String;
    srcReceiver: Address;
    timelock: Int; 
    messenger: Address;
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>;
}

message(0x5cdd41d9) LockCommitment{
    data: LockCommitmentData;
}
struct LockCommitmentData{
    commitId: Int;
    hashlock: Int;
    timelock: Int;
}

message(0xa958ac23) Uncommit{
    data: UncommitData;
}
struct UncommitData{
    commitId: Int;
}

message(0x12e78cb1) Lock {
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

message(0x758db085) Redeem {
    data: RedeemData;
}
struct RedeemData {
    lockId: Int;
    secret: Int;
}

message(0xad821ef9) Unlock {
    data: UnlockData;
}
struct UnlockData {
    hashlock: Int;
}

message(0xc1d818ff) LockCommitmentSig{
    data: LockCommitmentSigData;
}

struct LockCommitmentSigData{
    commitId: Int;
    data: Slice; 
    signature: Slice;
    publicKey: Int;
}

// Emitted messages
message(0x71f9f7aa) TokenCommitted{
    commitId: Int;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    sender: Address;
    srcReceiver: Address;
    srcAsset: String;
    amount: Int;
    timelock: Int; 
    messenger: Address;
    hopChains: map<Int,StringImpl>;
    hopAssets: map<Int,StringImpl>;
    hopAddresses: map<Int,StringImpl>;
}

message(0x95b0219d) TokenLocked{
    hashlock: Int;
    dstChain: String;
    dstAddress: String;
    dstAsset: String;
    sender: Address;
    srcReceiver: Address;
    srcAsset: String;
    amount: Int;
    timelock: Int;
    messenger: Address?;
    commitId: Int?;
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

            emit(TokenCommitted{
                                commitId: commitId,
                                dstChain: msg.data.dstChain,
                                dstAddress: msg.data.dstAddress,
                                dstAsset: msg.data.dstAsset,
                                sender: sender(),
                                srcReceiver: msg.data.srcReceiver,
                                srcAsset: msg.data.srcAsset,
                                amount: ctx.value,
                                timelock: msg.data.timelock,
                                messenger: msg.data.messenger,
                                hopChains: msg.data.hopChains,
                                hopAssets: msg.data.hopAssets,
                                hopAddresses: msg.data.hopAddresses
                                }.toCell());
    }

    receive(msg: Uncommit){
        require(self.commitExists(msg.data.commitId) == true,"Commit Does Not Exist");
        let commitObj: PHTLC = (self.commits.get(msg.data.commitId)!!);

        require(commitObj.uncommitted == false,"Already Uncommitted");
        require(commitObj.locked == false,"Already Locked");
        require(commitObj.timelock <= now(),"Not Passed Timelock");

        let ctx: Context = context();

        // sends to user commited amount 
        // mode:1 to pay fees seperately,
        // so user can get exactly as much as he committed

        send(SendParameters{to: commitObj.sender,
                            bounce: false,
                            value: commitObj.amount,
                            mode: 1}); 

        // sends tx sender the remaining amount after msg processing
        // value: 0 (only remaining amount)  mode:64 (fees will be payed from remaining amount)
        send(SendParameters{to: sender(),
                            bounce: false,
                            value: 0,
                            mode: 64});

        self.commits.del(msg.data.commitId);

    }

    receive(msg: LockCommitment){
        self.lockCommitment(msg,context());
    }

    receive(msg: LockCommitmentSig){
        require(self.commitExists(msg.data.commitId),"Commitment does not exist");
        require(checkSignature(msg.data.data.hash(),msg.data.signature,msg.data.publicKey),"Invalid signature");
        let hashlock: Int = msg.data.data.loadInt(257);
        let timelock: Int = msg.data.data.loadInt(257);
        let lockCommitmentMessage: LockCommitment = LockCommitment{
                                                                    data: LockCommitmentData{
                                                                        commitId: msg.data.commitId,
                                                                        hashlock: hashlock,
                                                                        timelock: timelock
                                                                    }
                                                                };
        let ctx: Context = context();
        self.lockCommitment(lockCommitmentMessage,ctx);
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
            // notify messenger
            // value:0 (as we dont send TON) mode:1 (fees will be payed separetly)
            send(SendParameters{to: msg.data.messenger!!,
                                bounce: true,
                                value: 0,
                                mode: 1,
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

        // mode:64 will be sent tx sender remaining amount after msg processing
        send(SendParameters{to: sender(),
                            bounce: true,
                            value: 0,
                            mode: 64});

        emit(TokenLocked{
                hashlock: msg.data.hashlock,
                dstChain: msg.data.dstChain,
                dstAddress: msg.data.dstAddress,
                dstAsset: msg.data.dstAsset,
                sender: sender(),
                srcReceiver: msg.data.srcReceiver,
                srcAsset: msg.data.srcAsset,
                amount: ctx.value,
                timelock: msg.data.timelock,
                messenger: msg.data.messenger,
                commitId: msg.data.commitId
            }.toCell());
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

        // receiver will get the exact amount which was locked for him,
        // as fee will be payed seperately
        send(SendParameters{
                    to: recieverAddr,
                    bounce: false,
                    value: contractValue,
                    mode: 1
                    }); 

        // tx sender will get only remaining amount of ton after msg processing
        send(SendParameters{
                to: sender(),
                bounce: false,
                value: 0,
                mode: 64
                });

        self.locks.del(msg.data.lockId);
    }

    receive(msg: Unlock){
        let ctx: Context = context();
        let lock: HTLC = self.locks.get(msg.data.hashlock)!!;
        require(self.lockExists(msg.data.hashlock) == true,"Lock Does Not Exist");
        require(lock.unlocked == false,"Already Unlocked");
        require(lock.redeemed == false,"Already Redeemed");
        require(lock.timelock < now(), "Not Passed Timelock");

        // user will get exact amount he locked
        send(SendParameters{
                    to: lock.sender,
                    bounce: false,
                    value: lock.amount,
                    mode: 1
                });

        // tx sender will get remainig amount after msg processing
        send(SendParameters{
                    to: ctx.sender,
                    bounce: false,
                    value: 0,
                    mode: 64
                });
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

    fun lockCommitment(msg: LockCommitment,ctx: Context){
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

         send(SendParameters{to: sender(),
                            bounce: false,
                            value: 0,
                            mode: 64});
        }else{
            require(false,"No Allowance");
        }
    }
}
