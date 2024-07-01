import "@stdlib/deploy";

    struct HTLCNotification {
        htlcID: Int;
        sender: Address;
        receiver: Address;
        amount: Int;
        timelock: Int;
        hashlock: Int;
        dstAddress: String;
        phtlcID: Int;
    }

    message HTLCNotify {
        data: HTLCNotification;
    }



contract Messenger with Deployable {
    init() {
        
    }

    receive(msg: HTLCNotify) {

    }

}




