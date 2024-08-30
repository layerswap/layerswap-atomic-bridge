import "@stdlib/deploy";

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


contract Messenger with Deployable {
    init() {
        
    }

    receive(msg: Notify) {

    }

}


