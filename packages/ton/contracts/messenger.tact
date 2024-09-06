import "@stdlib/deploy";

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

contract Messenger with Deployable {
    init() {
        
    }

    receive(msg: Notify) {

    }

}


