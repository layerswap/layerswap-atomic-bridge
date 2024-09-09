import { 
    Cell,
    Slice, 
    Address, 
    Builder, 
    beginCell, 
    ComputeError, 
    TupleItem, 
    TupleReader, 
    Dictionary, 
    contractAddress, 
    ContractProvider, 
    Sender, 
    Contract, 
    ContractABI, 
    ABIType,
    ABIGetter,
    ABIReceiver,
    TupleBuilder,
    DictionaryValue
} from '@ton/core';

export type StateInit = {
    $$type: 'StateInit';
    code: Cell;
    data: Cell;
}

export function storeStateInit(src: StateInit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeRef(src.code);
        b_0.storeRef(src.data);
    };
}

export function loadStateInit(slice: Slice) {
    let sc_0 = slice;
    let _code = sc_0.loadRef();
    let _data = sc_0.loadRef();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function loadTupleStateInit(source: TupleReader) {
    let _code = source.readCell();
    let _data = source.readCell();
    return { $$type: 'StateInit' as const, code: _code, data: _data };
}

function storeTupleStateInit(source: StateInit) {
    let builder = new TupleBuilder();
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserStateInit(): DictionaryValue<StateInit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStateInit(src)).endCell());
        },
        parse: (src) => {
            return loadStateInit(src.loadRef().beginParse());
        }
    }
}

export type Context = {
    $$type: 'Context';
    bounced: boolean;
    sender: Address;
    value: bigint;
    raw: Slice;
}

export function storeContext(src: Context) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounced);
        b_0.storeAddress(src.sender);
        b_0.storeInt(src.value, 257);
        b_0.storeRef(src.raw.asCell());
    };
}

export function loadContext(slice: Slice) {
    let sc_0 = slice;
    let _bounced = sc_0.loadBit();
    let _sender = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _raw = sc_0.loadRef().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function loadTupleContext(source: TupleReader) {
    let _bounced = source.readBoolean();
    let _sender = source.readAddress();
    let _value = source.readBigNumber();
    let _raw = source.readCell().asSlice();
    return { $$type: 'Context' as const, bounced: _bounced, sender: _sender, value: _value, raw: _raw };
}

function storeTupleContext(source: Context) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounced);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.value);
    builder.writeSlice(source.raw.asCell());
    return builder.build();
}

function dictValueParserContext(): DictionaryValue<Context> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeContext(src)).endCell());
        },
        parse: (src) => {
            return loadContext(src.loadRef().beginParse());
        }
    }
}

export type SendParameters = {
    $$type: 'SendParameters';
    bounce: boolean;
    to: Address;
    value: bigint;
    mode: bigint;
    body: Cell | null;
    code: Cell | null;
    data: Cell | null;
}

export function storeSendParameters(src: SendParameters) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeBit(src.bounce);
        b_0.storeAddress(src.to);
        b_0.storeInt(src.value, 257);
        b_0.storeInt(src.mode, 257);
        if (src.body !== null && src.body !== undefined) { b_0.storeBit(true).storeRef(src.body); } else { b_0.storeBit(false); }
        if (src.code !== null && src.code !== undefined) { b_0.storeBit(true).storeRef(src.code); } else { b_0.storeBit(false); }
        if (src.data !== null && src.data !== undefined) { b_0.storeBit(true).storeRef(src.data); } else { b_0.storeBit(false); }
    };
}

export function loadSendParameters(slice: Slice) {
    let sc_0 = slice;
    let _bounce = sc_0.loadBit();
    let _to = sc_0.loadAddress();
    let _value = sc_0.loadIntBig(257);
    let _mode = sc_0.loadIntBig(257);
    let _body = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _code = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _data = sc_0.loadBit() ? sc_0.loadRef() : null;
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function loadTupleSendParameters(source: TupleReader) {
    let _bounce = source.readBoolean();
    let _to = source.readAddress();
    let _value = source.readBigNumber();
    let _mode = source.readBigNumber();
    let _body = source.readCellOpt();
    let _code = source.readCellOpt();
    let _data = source.readCellOpt();
    return { $$type: 'SendParameters' as const, bounce: _bounce, to: _to, value: _value, mode: _mode, body: _body, code: _code, data: _data };
}

function storeTupleSendParameters(source: SendParameters) {
    let builder = new TupleBuilder();
    builder.writeBoolean(source.bounce);
    builder.writeAddress(source.to);
    builder.writeNumber(source.value);
    builder.writeNumber(source.mode);
    builder.writeCell(source.body);
    builder.writeCell(source.code);
    builder.writeCell(source.data);
    return builder.build();
}

function dictValueParserSendParameters(): DictionaryValue<SendParameters> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeSendParameters(src)).endCell());
        },
        parse: (src) => {
            return loadSendParameters(src.loadRef().beginParse());
        }
    }
}

export type Deploy = {
    $$type: 'Deploy';
    queryId: bigint;
}

export function storeDeploy(src: Deploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2490013878, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2490013878) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function loadTupleDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'Deploy' as const, queryId: _queryId };
}

function storeTupleDeploy(source: Deploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeploy(): DictionaryValue<Deploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadDeploy(src.loadRef().beginParse());
        }
    }
}

export type DeployOk = {
    $$type: 'DeployOk';
    queryId: bigint;
}

export function storeDeployOk(src: DeployOk) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2952335191, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadDeployOk(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2952335191) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function loadTupleDeployOk(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'DeployOk' as const, queryId: _queryId };
}

function storeTupleDeployOk(source: DeployOk) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserDeployOk(): DictionaryValue<DeployOk> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeDeployOk(src)).endCell());
        },
        parse: (src) => {
            return loadDeployOk(src.loadRef().beginParse());
        }
    }
}

export type FactoryDeploy = {
    $$type: 'FactoryDeploy';
    queryId: bigint;
    cashback: Address;
}

export function storeFactoryDeploy(src: FactoryDeploy) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1829761339, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeAddress(src.cashback);
    };
}

export function loadFactoryDeploy(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1829761339) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _cashback = sc_0.loadAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function loadTupleFactoryDeploy(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _cashback = source.readAddress();
    return { $$type: 'FactoryDeploy' as const, queryId: _queryId, cashback: _cashback };
}

function storeTupleFactoryDeploy(source: FactoryDeploy) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeAddress(source.cashback);
    return builder.build();
}

function dictValueParserFactoryDeploy(): DictionaryValue<FactoryDeploy> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeFactoryDeploy(src)).endCell());
        },
        parse: (src) => {
            return loadFactoryDeploy(src.loadRef().beginParse());
        }
    }
}

export type TokenTransfer = {
    $$type: 'TokenTransfer';
    queryId: bigint;
    amount: bigint;
    destination: Address;
    response_destination: Address;
    custom_payload: Cell | null;
    forward_ton_amount: bigint;
    forward_payload: Slice;
}

export function storeTokenTransfer(src: TokenTransfer) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(260734629, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeCoins(src.amount);
        b_0.storeAddress(src.destination);
        b_0.storeAddress(src.response_destination);
        if (src.custom_payload !== null && src.custom_payload !== undefined) { b_0.storeBit(true).storeRef(src.custom_payload); } else { b_0.storeBit(false); }
        b_0.storeCoins(src.forward_ton_amount);
        b_0.storeBuilder(src.forward_payload.asBuilder());
    };
}

export function loadTokenTransfer(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 260734629) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _amount = sc_0.loadCoins();
    let _destination = sc_0.loadAddress();
    let _response_destination = sc_0.loadAddress();
    let _custom_payload = sc_0.loadBit() ? sc_0.loadRef() : null;
    let _forward_ton_amount = sc_0.loadCoins();
    let _forward_payload = sc_0;
    return { $$type: 'TokenTransfer' as const, queryId: _queryId, amount: _amount, destination: _destination, response_destination: _response_destination, custom_payload: _custom_payload, forward_ton_amount: _forward_ton_amount, forward_payload: _forward_payload };
}

function loadTupleTokenTransfer(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _destination = source.readAddress();
    let _response_destination = source.readAddress();
    let _custom_payload = source.readCellOpt();
    let _forward_ton_amount = source.readBigNumber();
    let _forward_payload = source.readCell().asSlice();
    return { $$type: 'TokenTransfer' as const, queryId: _queryId, amount: _amount, destination: _destination, response_destination: _response_destination, custom_payload: _custom_payload, forward_ton_amount: _forward_ton_amount, forward_payload: _forward_payload };
}

function storeTupleTokenTransfer(source: TokenTransfer) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.amount);
    builder.writeAddress(source.destination);
    builder.writeAddress(source.response_destination);
    builder.writeCell(source.custom_payload);
    builder.writeNumber(source.forward_ton_amount);
    builder.writeSlice(source.forward_payload.asCell());
    return builder.build();
}

function dictValueParserTokenTransfer(): DictionaryValue<TokenTransfer> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenTransfer(src)).endCell());
        },
        parse: (src) => {
            return loadTokenTransfer(src.loadRef().beginParse());
        }
    }
}

export type TokenNotification = {
    $$type: 'TokenNotification';
    queryId: bigint;
    amount: bigint;
    from: Address;
    forward_payload: Slice;
}

export function storeTokenNotification(src: TokenNotification) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1935855772, 32);
        b_0.storeUint(src.queryId, 64);
        b_0.storeCoins(src.amount);
        b_0.storeAddress(src.from);
        b_0.storeBuilder(src.forward_payload.asBuilder());
    };
}

export function loadTokenNotification(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1935855772) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    let _amount = sc_0.loadCoins();
    let _from = sc_0.loadAddress();
    let _forward_payload = sc_0;
    return { $$type: 'TokenNotification' as const, queryId: _queryId, amount: _amount, from: _from, forward_payload: _forward_payload };
}

function loadTupleTokenNotification(source: TupleReader) {
    let _queryId = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _from = source.readAddress();
    let _forward_payload = source.readCell().asSlice();
    return { $$type: 'TokenNotification' as const, queryId: _queryId, amount: _amount, from: _from, forward_payload: _forward_payload };
}

function storeTupleTokenNotification(source: TokenNotification) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    builder.writeNumber(source.amount);
    builder.writeAddress(source.from);
    builder.writeSlice(source.forward_payload.asCell());
    return builder.build();
}

function dictValueParserTokenNotification(): DictionaryValue<TokenNotification> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenNotification(src)).endCell());
        },
        parse: (src) => {
            return loadTokenNotification(src.loadRef().beginParse());
        }
    }
}

export type TokenExcesses = {
    $$type: 'TokenExcesses';
    queryId: bigint;
}

export function storeTokenExcesses(src: TokenExcesses) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3576854235, 32);
        b_0.storeUint(src.queryId, 64);
    };
}

export function loadTokenExcesses(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3576854235) { throw Error('Invalid prefix'); }
    let _queryId = sc_0.loadUintBig(64);
    return { $$type: 'TokenExcesses' as const, queryId: _queryId };
}

function loadTupleTokenExcesses(source: TupleReader) {
    let _queryId = source.readBigNumber();
    return { $$type: 'TokenExcesses' as const, queryId: _queryId };
}

function storeTupleTokenExcesses(source: TokenExcesses) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.queryId);
    return builder.build();
}

function dictValueParserTokenExcesses(): DictionaryValue<TokenExcesses> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenExcesses(src)).endCell());
        },
        parse: (src) => {
            return loadTokenExcesses(src.loadRef().beginParse());
        }
    }
}

export type Notify = {
    $$type: 'Notify';
    Id: bigint;
    hashlock: bigint;
    dstChain: string;
    dstAsset: string;
    dstAddress: string;
    srcAsset: string;
    sender: Address;
    srcReceiver: Address;
    amount: bigint;
    timelock: bigint;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;
}

export function storeNotify(src: Notify) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1005277634, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeInt(src.hashlock, 257);
        b_0.storeStringRefTail(src.dstChain);
        b_0.storeStringRefTail(src.dstAsset);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAddress);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeAddress(src.sender);
        b_1.storeAddress(src.srcReceiver);
        b_1.storeInt(src.amount, 257);
        let b_2 = new Builder();
        b_2.storeInt(src.timelock, 257);
        b_2.storeAddress(src.jettonMasterAddress);
        b_2.storeAddress(src.htlcJettonWalletAddress);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadNotify(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1005277634) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _hashlock = sc_0.loadIntBig(257);
    let _dstChain = sc_0.loadStringRefTail();
    let _dstAsset = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAddress = sc_1.loadStringRefTail();
    let _srcAsset = sc_1.loadStringRefTail();
    let _sender = sc_1.loadAddress();
    let _srcReceiver = sc_1.loadAddress();
    let _amount = sc_1.loadIntBig(257);
    let sc_2 = sc_1.loadRef().beginParse();
    let _timelock = sc_2.loadIntBig(257);
    let _jettonMasterAddress = sc_2.loadAddress();
    let _htlcJettonWalletAddress = sc_2.loadAddress();
    return { $$type: 'Notify' as const, Id: _Id, hashlock: _hashlock, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, amount: _amount, timelock: _timelock, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleNotify(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _dstAddress = source.readString();
    let _srcAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _jettonMasterAddress = source.readAddress();
    let _htlcJettonWalletAddress = source.readAddress();
    return { $$type: 'Notify' as const, Id: _Id, hashlock: _hashlock, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, amount: _amount, timelock: _timelock, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleNotify(source: Notify) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeNumber(source.hashlock);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.dstAddress);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.jettonMasterAddress);
    builder.writeAddress(source.htlcJettonWalletAddress);
    return builder.build();
}

function dictValueParserNotify(): DictionaryValue<Notify> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotify(src)).endCell());
        },
        parse: (src) => {
            return loadNotify(src.loadRef().beginParse());
        }
    }
}

export type HTLC = {
    $$type: 'HTLC';
    dstAddress: string;
    dstChain: string;
    dstAsset: string;
    srcAsset: string;
    sender: Address;
    senderPubKey: bigint;
    srcReceiver: Address;
    secret: bigint;
    hashlock: bigint;
    amount: bigint;
    timelock: bigint;
    messenger: Address;
    redeemed: boolean;
    refunded: boolean;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;
}

export function storeHTLC(src: HTLC) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeStringRefTail(src.dstAddress);
        b_0.storeStringRefTail(src.dstChain);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAsset);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeAddress(src.sender);
        b_1.storeInt(src.senderPubKey, 257);
        b_1.storeAddress(src.srcReceiver);
        let b_2 = new Builder();
        b_2.storeInt(src.secret, 257);
        b_2.storeInt(src.hashlock, 257);
        b_2.storeInt(src.amount, 257);
        let b_3 = new Builder();
        b_3.storeInt(src.timelock, 257);
        b_3.storeAddress(src.messenger);
        b_3.storeBit(src.redeemed);
        b_3.storeBit(src.refunded);
        b_3.storeAddress(src.jettonMasterAddress);
        let b_4 = new Builder();
        b_4.storeAddress(src.htlcJettonWalletAddress);
        b_3.storeRef(b_4.endCell());
        b_2.storeRef(b_3.endCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadHTLC(slice: Slice) {
    let sc_0 = slice;
    let _dstAddress = sc_0.loadStringRefTail();
    let _dstChain = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAsset = sc_1.loadStringRefTail();
    let _srcAsset = sc_1.loadStringRefTail();
    let _sender = sc_1.loadAddress();
    let _senderPubKey = sc_1.loadIntBig(257);
    let _srcReceiver = sc_1.loadAddress();
    let sc_2 = sc_1.loadRef().beginParse();
    let _secret = sc_2.loadIntBig(257);
    let _hashlock = sc_2.loadIntBig(257);
    let _amount = sc_2.loadIntBig(257);
    let sc_3 = sc_2.loadRef().beginParse();
    let _timelock = sc_3.loadIntBig(257);
    let _messenger = sc_3.loadAddress();
    let _redeemed = sc_3.loadBit();
    let _refunded = sc_3.loadBit();
    let _jettonMasterAddress = sc_3.loadAddress();
    let sc_4 = sc_3.loadRef().beginParse();
    let _htlcJettonWalletAddress = sc_4.loadAddress();
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, senderPubKey: _senderPubKey, srcReceiver: _srcReceiver, secret: _secret, hashlock: _hashlock, amount: _amount, timelock: _timelock, messenger: _messenger, redeemed: _redeemed, refunded: _refunded, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleHTLC(source: TupleReader) {
    let _dstAddress = source.readString();
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _srcAsset = source.readString();
    let _sender = source.readAddress();
    let _senderPubKey = source.readBigNumber();
    let _srcReceiver = source.readAddress();
    let _secret = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _redeemed = source.readBoolean();
    let _refunded = source.readBoolean();
    source = source.readTuple();
    let _jettonMasterAddress = source.readAddress();
    let _htlcJettonWalletAddress = source.readAddress();
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, senderPubKey: _senderPubKey, srcReceiver: _srcReceiver, secret: _secret, hashlock: _hashlock, amount: _amount, timelock: _timelock, messenger: _messenger, redeemed: _redeemed, refunded: _refunded, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleHTLC(source: HTLC) {
    let builder = new TupleBuilder();
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.sender);
    builder.writeNumber(source.senderPubKey);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.secret);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
    builder.writeBoolean(source.redeemed);
    builder.writeBoolean(source.refunded);
    builder.writeAddress(source.jettonMasterAddress);
    builder.writeAddress(source.htlcJettonWalletAddress);
    return builder.build();
}

function dictValueParserHTLC(): DictionaryValue<HTLC> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeHTLC(src)).endCell());
        },
        parse: (src) => {
            return loadHTLC(src.loadRef().beginParse());
        }
    }
}

export type CommitData = {
    $$type: 'CommitData';
    dstChain: string;
    dstAsset: string;
    dstAddress: string;
    srcAsset: string;
    srcReceiver: Address;
    timelock: bigint;
    messenger: Address;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;
    senderPubKey: bigint;
    hopChains: Dictionary<bigint, StringImpl>;
    hopAssets: Dictionary<bigint, StringImpl>;
    hopAddresses: Dictionary<bigint, StringImpl>;
}

export function storeCommitData(src: CommitData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeStringRefTail(src.dstChain);
        b_0.storeStringRefTail(src.dstAsset);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAddress);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeAddress(src.srcReceiver);
        b_1.storeInt(src.timelock, 257);
        b_1.storeAddress(src.messenger);
        let b_2 = new Builder();
        b_2.storeAddress(src.jettonMasterAddress);
        b_2.storeAddress(src.htlcJettonWalletAddress);
        b_2.storeInt(src.senderPubKey, 257);
        b_2.storeDict(src.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_2.storeDict(src.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_2.storeDict(src.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadCommitData(slice: Slice) {
    let sc_0 = slice;
    let _dstChain = sc_0.loadStringRefTail();
    let _dstAsset = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAddress = sc_1.loadStringRefTail();
    let _srcAsset = sc_1.loadStringRefTail();
    let _srcReceiver = sc_1.loadAddress();
    let _timelock = sc_1.loadIntBig(257);
    let _messenger = sc_1.loadAddress();
    let sc_2 = sc_1.loadRef().beginParse();
    let _jettonMasterAddress = sc_2.loadAddress();
    let _htlcJettonWalletAddress = sc_2.loadAddress();
    let _senderPubKey = sc_2.loadIntBig(257);
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    return { $$type: 'CommitData' as const, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function loadTupleCommitData(source: TupleReader) {
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _dstAddress = source.readString();
    let _srcAsset = source.readString();
    let _srcReceiver = source.readAddress();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _jettonMasterAddress = source.readAddress();
    let _htlcJettonWalletAddress = source.readAddress();
    let _senderPubKey = source.readBigNumber();
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    return { $$type: 'CommitData' as const, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function storeTupleCommitData(source: CommitData) {
    let builder = new TupleBuilder();
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.dstAddress);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
    builder.writeAddress(source.jettonMasterAddress);
    builder.writeAddress(source.htlcJettonWalletAddress);
    builder.writeNumber(source.senderPubKey);
    builder.writeCell(source.hopChains.size > 0 ? beginCell().storeDictDirect(source.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAssets.size > 0 ? beginCell().storeDictDirect(source.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAddresses.size > 0 ? beginCell().storeDictDirect(source.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    return builder.build();
}

function dictValueParserCommitData(): DictionaryValue<CommitData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCommitData(src)).endCell());
        },
        parse: (src) => {
            return loadCommitData(src.loadRef().beginParse());
        }
    }
}

export type LockData = {
    $$type: 'LockData';
    Id: bigint;
    timelock: bigint;
    srcReceiver: Address;
    srcAsset: string;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    hashlock: bigint;
    messenger: Address;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;
}

export function storeLockData(src: LockData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.Id, 257);
        b_0.storeInt(src.timelock, 257);
        b_0.storeAddress(src.srcReceiver);
        b_0.storeStringRefTail(src.srcAsset);
        b_0.storeStringRefTail(src.dstChain);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAddress);
        b_1.storeStringRefTail(src.dstAsset);
        b_1.storeInt(src.hashlock, 257);
        b_1.storeAddress(src.messenger);
        b_1.storeAddress(src.jettonMasterAddress);
        let b_2 = new Builder();
        b_2.storeAddress(src.htlcJettonWalletAddress);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadLockData(slice: Slice) {
    let sc_0 = slice;
    let _Id = sc_0.loadIntBig(257);
    let _timelock = sc_0.loadIntBig(257);
    let _srcReceiver = sc_0.loadAddress();
    let _srcAsset = sc_0.loadStringRefTail();
    let _dstChain = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAddress = sc_1.loadStringRefTail();
    let _dstAsset = sc_1.loadStringRefTail();
    let _hashlock = sc_1.loadIntBig(257);
    let _messenger = sc_1.loadAddress();
    let _jettonMasterAddress = sc_1.loadAddress();
    let sc_2 = sc_1.loadRef().beginParse();
    let _htlcJettonWalletAddress = sc_2.loadAddress();
    return { $$type: 'LockData' as const, Id: _Id, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, hashlock: _hashlock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleLockData(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _hashlock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _jettonMasterAddress = source.readAddress();
    let _htlcJettonWalletAddress = source.readAddress();
    return { $$type: 'LockData' as const, Id: _Id, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, hashlock: _hashlock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleLockData(source: LockData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeNumber(source.hashlock);
    builder.writeAddress(source.messenger);
    builder.writeAddress(source.jettonMasterAddress);
    builder.writeAddress(source.htlcJettonWalletAddress);
    return builder.build();
}

function dictValueParserLockData(): DictionaryValue<LockData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLockData(src)).endCell());
        },
        parse: (src) => {
            return loadLockData(src.loadRef().beginParse());
        }
    }
}

export type AddLock = {
    $$type: 'AddLock';
    Id: bigint;
    hashlock: bigint;
    timelock: bigint;
}

export function storeAddLock(src: AddLock) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1558004185, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeInt(src.hashlock, 257);
        b_0.storeInt(src.timelock, 257);
    };
}

export function loadAddLock(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1558004185) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _hashlock = sc_0.loadIntBig(257);
    let _timelock = sc_0.loadIntBig(257);
    return { $$type: 'AddLock' as const, Id: _Id, hashlock: _hashlock, timelock: _timelock };
}

function loadTupleAddLock(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _timelock = source.readBigNumber();
    return { $$type: 'AddLock' as const, Id: _Id, hashlock: _hashlock, timelock: _timelock };
}

function storeTupleAddLock(source: AddLock) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    return builder.build();
}

function dictValueParserAddLock(): DictionaryValue<AddLock> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAddLock(src)).endCell());
        },
        parse: (src) => {
            return loadAddLock(src.loadRef().beginParse());
        }
    }
}

export type Redeem = {
    $$type: 'Redeem';
    Id: bigint;
    secret: bigint;
}

export function storeRedeem(src: Redeem) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1972220037, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeInt(src.secret, 257);
    };
}

export function loadRedeem(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1972220037) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _secret = sc_0.loadIntBig(257);
    return { $$type: 'Redeem' as const, Id: _Id, secret: _secret };
}

function loadTupleRedeem(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _secret = source.readBigNumber();
    return { $$type: 'Redeem' as const, Id: _Id, secret: _secret };
}

function storeTupleRedeem(source: Redeem) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeNumber(source.secret);
    return builder.build();
}

function dictValueParserRedeem(): DictionaryValue<Redeem> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRedeem(src)).endCell());
        },
        parse: (src) => {
            return loadRedeem(src.loadRef().beginParse());
        }
    }
}

export type Refund = {
    $$type: 'Refund';
    Id: bigint;
}

export function storeRefund(src: Refund) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2910985977, 32);
        b_0.storeInt(src.Id, 257);
    };
}

export function loadRefund(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2910985977) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    return { $$type: 'Refund' as const, Id: _Id };
}

function loadTupleRefund(source: TupleReader) {
    let _Id = source.readBigNumber();
    return { $$type: 'Refund' as const, Id: _Id };
}

function storeTupleRefund(source: Refund) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    return builder.build();
}

function dictValueParserRefund(): DictionaryValue<Refund> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRefund(src)).endCell());
        },
        parse: (src) => {
            return loadRefund(src.loadRef().beginParse());
        }
    }
}

export type AddLockSig = {
    $$type: 'AddLockSig';
    Id: bigint;
    data: Slice;
    signature: Slice;
}

export function storeAddLockSig(src: AddLockSig) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3252164863, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeRef(src.data.asCell());
        b_0.storeRef(src.signature.asCell());
    };
}

export function loadAddLockSig(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3252164863) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _data = sc_0.loadRef().asSlice();
    let _signature = sc_0.loadRef().asSlice();
    return { $$type: 'AddLockSig' as const, Id: _Id, data: _data, signature: _signature };
}

function loadTupleAddLockSig(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _data = source.readCell().asSlice();
    let _signature = source.readCell().asSlice();
    return { $$type: 'AddLockSig' as const, Id: _Id, data: _data, signature: _signature };
}

function storeTupleAddLockSig(source: AddLockSig) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeSlice(source.data.asCell());
    builder.writeSlice(source.signature.asCell());
    return builder.build();
}

function dictValueParserAddLockSig(): DictionaryValue<AddLockSig> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeAddLockSig(src)).endCell());
        },
        parse: (src) => {
            return loadAddLockSig(src.loadRef().beginParse());
        }
    }
}

export type TokenCommitted = {
    $$type: 'TokenCommitted';
    Id: bigint;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    sender: Address;
    srcReceiver: Address;
    srcAsset: string;
    amount: bigint;
    timelock: bigint;
    messenger: Address;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;
    senderPubKey: bigint;
    hopChains: Dictionary<bigint, StringImpl>;
    hopAssets: Dictionary<bigint, StringImpl>;
    hopAddresses: Dictionary<bigint, StringImpl>;
}

export function storeTokenCommitted(src: TokenCommitted) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3208455377, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeStringRefTail(src.dstChain);
        b_0.storeStringRefTail(src.dstAddress);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAsset);
        b_1.storeAddress(src.sender);
        b_1.storeAddress(src.srcReceiver);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeInt(src.amount, 257);
        let b_2 = new Builder();
        b_2.storeInt(src.timelock, 257);
        b_2.storeAddress(src.messenger);
        b_2.storeAddress(src.jettonMasterAddress);
        let b_3 = new Builder();
        b_3.storeAddress(src.htlcJettonWalletAddress);
        b_3.storeInt(src.senderPubKey, 257);
        b_3.storeDict(src.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_3.storeDict(src.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_3.storeDict(src.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_2.storeRef(b_3.endCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTokenCommitted(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3208455377) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _dstChain = sc_0.loadStringRefTail();
    let _dstAddress = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAsset = sc_1.loadStringRefTail();
    let _sender = sc_1.loadAddress();
    let _srcReceiver = sc_1.loadAddress();
    let _srcAsset = sc_1.loadStringRefTail();
    let _amount = sc_1.loadIntBig(257);
    let sc_2 = sc_1.loadRef().beginParse();
    let _timelock = sc_2.loadIntBig(257);
    let _messenger = sc_2.loadAddress();
    let _jettonMasterAddress = sc_2.loadAddress();
    let sc_3 = sc_2.loadRef().beginParse();
    let _htlcJettonWalletAddress = sc_3.loadAddress();
    let _senderPubKey = sc_3.loadIntBig(257);
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_3);
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_3);
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_3);
    return { $$type: 'TokenCommitted' as const, Id: _Id, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function loadTupleTokenCommitted(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _jettonMasterAddress = source.readAddress();
    let _htlcJettonWalletAddress = source.readAddress();
    let _senderPubKey = source.readBigNumber();
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    source = source.readTuple();
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    return { $$type: 'TokenCommitted' as const, Id: _Id, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function storeTupleTokenCommitted(source: TokenCommitted) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
    builder.writeAddress(source.jettonMasterAddress);
    builder.writeAddress(source.htlcJettonWalletAddress);
    builder.writeNumber(source.senderPubKey);
    builder.writeCell(source.hopChains.size > 0 ? beginCell().storeDictDirect(source.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAssets.size > 0 ? beginCell().storeDictDirect(source.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAddresses.size > 0 ? beginCell().storeDictDirect(source.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    return builder.build();
}

function dictValueParserTokenCommitted(): DictionaryValue<TokenCommitted> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenCommitted(src)).endCell());
        },
        parse: (src) => {
            return loadTokenCommitted(src.loadRef().beginParse());
        }
    }
}

export type TokenLocked = {
    $$type: 'TokenLocked';
    Id: bigint;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    sender: Address;
    srcReceiver: Address;
    srcAsset: string;
    amount: bigint;
    timelock: bigint;
    messenger: Address;
    hashlock: bigint;
    jettonMasterAddress: Address;
    htlcJettonWalletAddress: Address;
}

export function storeTokenLocked(src: TokenLocked) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(256369080, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeStringRefTail(src.dstChain);
        b_0.storeStringRefTail(src.dstAddress);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAsset);
        b_1.storeAddress(src.sender);
        b_1.storeAddress(src.srcReceiver);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeInt(src.amount, 257);
        let b_2 = new Builder();
        b_2.storeInt(src.timelock, 257);
        b_2.storeAddress(src.messenger);
        b_2.storeInt(src.hashlock, 257);
        let b_3 = new Builder();
        b_3.storeAddress(src.jettonMasterAddress);
        b_3.storeAddress(src.htlcJettonWalletAddress);
        b_2.storeRef(b_3.endCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTokenLocked(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 256369080) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _dstChain = sc_0.loadStringRefTail();
    let _dstAddress = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAsset = sc_1.loadStringRefTail();
    let _sender = sc_1.loadAddress();
    let _srcReceiver = sc_1.loadAddress();
    let _srcAsset = sc_1.loadStringRefTail();
    let _amount = sc_1.loadIntBig(257);
    let sc_2 = sc_1.loadRef().beginParse();
    let _timelock = sc_2.loadIntBig(257);
    let _messenger = sc_2.loadAddress();
    let _hashlock = sc_2.loadIntBig(257);
    let sc_3 = sc_2.loadRef().beginParse();
    let _jettonMasterAddress = sc_3.loadAddress();
    let _htlcJettonWalletAddress = sc_3.loadAddress();
    return { $$type: 'TokenLocked' as const, Id: _Id, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, hashlock: _hashlock, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleTokenLocked(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _hashlock = source.readBigNumber();
    let _jettonMasterAddress = source.readAddress();
    let _htlcJettonWalletAddress = source.readAddress();
    return { $$type: 'TokenLocked' as const, Id: _Id, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, hashlock: _hashlock, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleTokenLocked(source: TokenLocked) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
    builder.writeNumber(source.hashlock);
    builder.writeAddress(source.jettonMasterAddress);
    builder.writeAddress(source.htlcJettonWalletAddress);
    return builder.build();
}

function dictValueParserTokenLocked(): DictionaryValue<TokenLocked> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenLocked(src)).endCell());
        },
        parse: (src) => {
            return loadTokenLocked(src.loadRef().beginParse());
        }
    }
}

export type StringImpl = {
    $$type: 'StringImpl';
    data: string;
}

export function storeStringImpl(src: StringImpl) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeStringRefTail(src.data);
    };
}

export function loadStringImpl(slice: Slice) {
    let sc_0 = slice;
    let _data = sc_0.loadStringRefTail();
    return { $$type: 'StringImpl' as const, data: _data };
}

function loadTupleStringImpl(source: TupleReader) {
    let _data = source.readString();
    return { $$type: 'StringImpl' as const, data: _data };
}

function storeTupleStringImpl(source: StringImpl) {
    let builder = new TupleBuilder();
    builder.writeString(source.data);
    return builder.build();
}

function dictValueParserStringImpl(): DictionaryValue<StringImpl> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeStringImpl(src)).endCell());
        },
        parse: (src) => {
            return loadStringImpl(src.loadRef().beginParse());
        }
    }
}

 type LayerswapV8Jetton_init_args = {
    $$type: 'LayerswapV8Jetton_init_args';
}

function initLayerswapV8Jetton_init_args(src: LayerswapV8Jetton_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
    };
}

async function LayerswapV8Jetton_init() {
    const __code = Cell.fromBase64('te6ccgECNgEAEG0AART/APSkE/S88sgLAQIBYgIDAvDQAdDTAwFxsKMB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFRQUwNvBPhhAvhi2zxVE9s88uCCyPhDAcx/AcoAVTBQNPQAgQEBzwCBAQHPAAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJ7VQQBAIBIAgJBMIBkjB/4HAh10nCH5UwINcLH94gghBzYtCcuuMCIIIQXN1B2bqOqDDTHwGCEFzdQdm68uCBgQEB1wCBAQHXAIEBAdcAVSBsE/hBbyTbPH/gIIIQwdgY/7rjAiCCEHWNsIW6BSQGBwLcMNMfAYIQc2LQnLry4IHTP/oA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFQTAxAjbBQzAsgBzxbJ0NMAMdQw0NMfIYIQZ2n6/rqOiVUzVHR22zxVM94BghAS54yxuo6DWds8kl8D4n8TFAP4MNMfAYIQwdgY/7ry4IGBAQHXANQB0AHUAdBDMGwTRlSCAOQxUUfbPBXy9CKBAQEoWfQNb6GSMG3fIG6SMG2Oi9DbPFcQVQ5vAm8P4iBu8tCAby9vIhCvXw+CAL0RJ/kBUHL5EBXy9ASBAQHXAIEBAdcAMBAm+EFvJNs8fy4wJAPcjp4w0x8BghB1jbCFuvLggYEBAdcAgQEB1wBZbBLbPH/gIIIQrYIe+bqOmDDTHwGCEK2CHvm68uCBgQEB1wABMds8f+AgghDVMnbbuo4UMNMfAYIQ1TJ227ry4IHTPwExMH/gghCUapi2uuMCMHAqKywCTb+mOQa6TAgIXdeXBEEGuFhRBAgn/deWhEwYTdeXBEbZ4qge2eNiDBAKAgEgCwwB8G1wJoEBAfSFb6UgkRKVMW0ybQHikI7cIG6SMG2Oi9DbPFcQVQ5vAm8P4iBu8tCAby9vIhC/Xw9SQMcFjh6BAQFUEwBUY1AhbpVbWfRaMJjIAc8AQTP0QuIBpFjegQEBKAJZ9HhvpSCUAtQwWJUxbTJtAeLoEDRfBDACEbgGnbPNs8bEGBANAgFIDg8AZnAkgQEB9IVvpSCREpUxbTJtAeKQjhswAaSBAQFURhNZ9HhvpSCUAtQwWJUxbTJtAeLoWwARsK+7UTQ0gABgAkmyfnbPFUD2zxsQSBukjBtnSBu8tCAby9vIm8Cbw/iIG6SMG3egEBEBlu1E0NQB+GPSAAGOMPQEgQEB1wCBAQHXAPpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgUQzBsFOAw+CjXCwqDCbry4InbPBIBQoEBASUCWfQNb6GSMG3fIG6SMG2Oi9DbPFcQVQ5vAm8P4jAA6G1wjQhgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEgqFhvMpxGZFbUHZLSr6GUpeXd1pfFxlRqkuC8N0V/oav+tkSSe8OtxPznr6qmHtub9Kf////////////+ERul/gl+BV/+GTeIaH4EaABBPQC2zyBEj4vwwDy9IFUsyj4I7zy9BERpFYQIbICERMCERGBXgAREVYS2zzAAAEREgHy9IEBAXAgcHBWEARWEwRWEwRWEgRWF1FOBFYUQTRWGwJWFQJWFQJWFVYVyBEQVeDbPMkQJFYTASBulTBZ9FowlEEz9BXiDxERDxUuJhYE5ALbPIFUs/gjK7ny9IESPi3DAPL0AhEQAlD+gSzlUevbPMAAH/L0gQEBcCBwcCpRTFFLUU8EVhQEA1YSVE5DVhgCVhYCVh5ZVh5WHsgREFXg2zzJLBA1ASBulTBZ9FowlEEz9BXiLVYRxwWzkyrDAJFw4hwuJh0BDNs8DdFVCxcBlBDeEL0QmggREQgHEREHBhERBgUREQUEEREEAxERAwIREQIBERMBERLIERBV4Ns8yciCWMAAAAAAAAAAAAAAAAEBy2fMyXD7ABAjGQH21AHQAdQB0AHUAdDUAdAB1AHQAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgBgQEB1wD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdQw0PpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgBGABg+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAGBAQHXAPQE9AT0BDAQvRC8AfSCEL89JNEBERHLHx+BAQHPAMhQDs8WyVANzMhQDM8WyVALzMjIUAvPFslQCsxQCCDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFlAGINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyFAFzxbJUATMEoEBARoB/s8AAciBAQHPAFgg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxZYINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyFADINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WFIEBAc8AFPQAFPQAFPQAyQHMyVjMyQEbAALMAQzbPAvRVQkeA8iPKn+CCTEtAFR8WHBUOr1WE1YRVhZWFFYbVhvIVbDbPMlWEwRQiBA0bW3bPJE04iQQrBBrCl41EGcFBAMREAMCERACUP7IVcDbPMnIgljAAAAAAAAAAAAAAAABActnzMlw+wATIDQhAcSBAQHXAIEBAdcA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHUAdAB1AHQAdQB0NQB0AHUAdABgQEB1wD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAR8AmvpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB1DDQ+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiDEQaxBqEGkQaBBnAfKCEDvrUcJQDcsfG4EBAc8AGYEBAc8AyFAIzxbJUAfMyFAGzxbJUAXMyMhQBc8WyVAEzMhQA88WyVjMASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFlgg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYSIgH0ghAPR+G4UA7LHxyBAQHPAMhQC88WyVAKzMhQCc8WyVAIzMjIUAjPFslQB8xQBSDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFlADINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyFjPFskBzIEBAc8AAcgjAKSBAQHPAALIgQEBzwBQAyDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFlADINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyVjMyQHMAOqBAQHPAFADINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WE4EBAc8AyFAEINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WUAQg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxbJWMzJWMzJAcwDyhAjXwNUFwNQdoIA5DFRZds8wP8X8vSBAQFUQxZZ9A1voZIwbd8gbpIwbY6L0Ns8VxBVDm8Cbw/iIG7y0IBvL28iNTcpVhXHBZNXFH+WUiARFccF4pxfDTI0NDSBe8fy8FnjDUEzLjAlA+gQLhEQHYIA5DERElYT2zzA/wEREwHy9IEhygXAABXy9IFUs1YU+CO88vSCALcnERDAAAEREAHy9IIAwAoREsAAARESAfL0EJsQihB5EGgQVxBGEDWBAQFwBhBeECQDERMDAnACcFkREMgREFXg2zzJEDVBQC4mJwH0yAEREM8WyQEREMzIUA7PFslQDczIyFANzxbJUAzMyFALzxbJUArMUAgg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxYWgQEBzwBQBCDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFgLIgQEBzwCBAQHPABIoATYgbpUwWfRaMJRBM/QV4vhCcHCAQBAjbW1t2zw0Af6BAQHPAALIgQEBzwBQAyDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFhPKABTKAFAFINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyFAEINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WyVADzMlQA8zJWMzJKQAEAcwD3PhBbyQwMkdlggDkMVFU2zzA/xby9CKBAQElWfQNb6GSMG3fIG6SMG2Oi9DbPFcQVQ5vAm8P4iBu8tCAby9vIjEzMzVsZg3Iy//J0PkCA4IAxuYEuhPy9IIAwAoCwAAS8vSCALcnAsAAEvL0yFAILjAtA9T4QW8kMDJGVIIA5DFRR9s8wP8V8vQigQEBKFn0DW+hkjBt3yBukjBtjovQ2zxXEFUObwJvD+IgbvLQgG8vbyIxMzU1NTU2NjY2ggCVXwH4I7ny9IIAwAoDwAAT8vSCALcnA8AAE/L0yFAILjAvAU7THwGCEJRqmLa68uCB0z8BMcgBghCv+Q9XWMsfyz/J+EIBcG3bPH8zArQg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxb4IwHKL8n5AHABsH9w+EJtcYuFJlZGVlbWVkgQXRBHyFVg2zzJEEkQOBAnECQQI21t2zxQBIEBAfRaMAMyNAFMgQEBJQJZ9A1voZIwbd8gbpIwbY6L0Ns8VxBVDm8Cbw/ibpFw4H8wArQg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxb4IwHKL8n5AHABsH9w+EJtcYuFJlZnVuZGVkgQVxBNyFVg2zzJECQQOEFwECQQI21t2zwUgQEB9FowUCMyNAHk1AHQAdQB0AHUAdDUAdAB1AHQAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgBgQEB1wD6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdQw0IEBAdcAgQEB1wCBAQHXANQw0IEBAdcAMQDa+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHSANIA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHUMND6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIMQ4REA4Q7wDIghAPin6lUAjLHxbLP1AE+gJYINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFiFus5V/AcoAzJRwMsoA4gH6AgHPFgE6bW0ibrOZWyBu8tCAbyIBkTLiECRwAwSAQlAj2zw0AcrIcQHKAVAHAcoAcAHKAlAFINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiM8WUAP6AnABymgjbrORf5MkbrPilzMzAXABygDjDSFus5x/AcoAASBu8tCAAcyVMXABygDiyQH7ADUAmH8BygDIcAHKAHABygAkbrOdfwHKAAQgbvLQgFAEzJY0A3ABygDiJG6znX8BygAEIG7y0IBQBMyWNANwAcoA4nABygACfwHKAALJWMw=');
    const __system = Cell.fromBase64('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');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initLayerswapV8Jetton_init_args({ $$type: 'LayerswapV8Jetton_init_args' })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const LayerswapV8Jetton_errors: { [key: number]: { message: string } } = {
    2: { message: `Stack underflow` },
    3: { message: `Stack overflow` },
    4: { message: `Integer overflow` },
    5: { message: `Integer out of expected range` },
    6: { message: `Invalid opcode` },
    7: { message: `Type check error` },
    8: { message: `Cell overflow` },
    9: { message: `Cell underflow` },
    10: { message: `Dictionary error` },
    13: { message: `Out of gas error` },
    32: { message: `Method ID not found` },
    34: { message: `Action is invalid or not supported` },
    37: { message: `Not enough TON` },
    38: { message: `Not enough extra-currencies` },
    128: { message: `Null reference exception` },
    129: { message: `Invalid serialization prefix` },
    130: { message: `Invalid incoming message` },
    131: { message: `Constraints error` },
    132: { message: `Access denied` },
    133: { message: `Contract stopped` },
    134: { message: `Invalid argument` },
    135: { message: `Code of a contract was not found` },
    136: { message: `Invalid address` },
    137: { message: `Masterchain support is not enabled for this contract` },
    4670: { message: `Funds Not Sent` },
    8650: { message: `Hashlock Already Set` },
    11493: { message: `Contract Already Exists` },
    21683: { message: `Not Future Timelock` },
    24064: { message: `HTLC Already Exists` },
    31687: { message: `No Allowance` },
    38239: { message: `Not Passed Timelock` },
    46887: { message: `Already Redeemed` },
    48401: { message: `Invalid signature` },
    49162: { message: `Already Refunded` },
    50918: { message: `Hashlock Not Match` },
    58417: { message: `Contract Does Not Exist` },
}

const LayerswapV8Jetton_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"TokenTransfer","header":260734629,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"destination","type":{"kind":"simple","type":"address","optional":false}},{"name":"response_destination","type":{"kind":"simple","type":"address","optional":false}},{"name":"custom_payload","type":{"kind":"simple","type":"cell","optional":true}},{"name":"forward_ton_amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"forward_payload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"TokenNotification","header":1935855772,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"from","type":{"kind":"simple","type":"address","optional":false}},{"name":"forward_payload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"TokenExcesses","header":3576854235,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"Notify","header":1005277634,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"HTLC","header":null,"fields":[{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"senderPubKey","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"redeemed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"CommitData","header":null,"fields":[{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"senderPubKey","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}}]},
    {"name":"LockData","header":null,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"AddLock","header":1558004185,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Redeem","header":1972220037,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Refund","header":2910985977,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"AddLockSig","header":3252164863,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"data","type":{"kind":"simple","type":"slice","optional":false}},{"name":"signature","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"TokenCommitted","header":3208455377,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"senderPubKey","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}}]},
    {"name":"TokenLocked","header":256369080,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"StringImpl","header":null,"fields":[{"name":"data","type":{"kind":"simple","type":"string","optional":false}}]},
]

const LayerswapV8Jetton_getters: ABIGetter[] = [
    {"name":"getDetails","arguments":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"HTLC","optional":true}},
    {"name":"getContractsLength","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getContracts","arguments":[{"name":"senderAddr","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"dict","key":"int","value":"int"}},
]

export const LayerswapV8Jetton_getterMapping: { [key: string]: string } = {
    'getDetails': 'getGetDetails',
    'getContractsLength': 'getGetContractsLength',
    'getContracts': 'getGetContracts',
}

const LayerswapV8Jetton_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"TokenNotification"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AddLock"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AddLockSig"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Redeem"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Refund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"TokenExcesses"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export class LayerswapV8Jetton implements Contract {
    
    static async init() {
        return await LayerswapV8Jetton_init();
    }
    
    static async fromInit() {
        const init = await LayerswapV8Jetton_init();
        const address = contractAddress(0, init);
        return new LayerswapV8Jetton(address, init);
    }
    
    static fromAddress(address: Address) {
        return new LayerswapV8Jetton(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  LayerswapV8Jetton_types,
        getters: LayerswapV8Jetton_getters,
        receivers: LayerswapV8Jetton_receivers,
        errors: LayerswapV8Jetton_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: TokenNotification | AddLock | AddLockSig | Redeem | Refund | TokenExcesses | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TokenNotification') {
            body = beginCell().store(storeTokenNotification(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AddLock') {
            body = beginCell().store(storeAddLock(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AddLockSig') {
            body = beginCell().store(storeAddLockSig(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Redeem') {
            body = beginCell().store(storeRedeem(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Refund') {
            body = beginCell().store(storeRefund(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TokenExcesses') {
            body = beginCell().store(storeTokenExcesses(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetDetails(provider: ContractProvider, Id: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(Id);
        let source = (await provider.get('getDetails', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleHTLC(result_p) : null;
        return result;
    }
    
    async getGetContractsLength(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('getContractsLength', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getGetContracts(provider: ContractProvider, senderAddr: Address) {
        let builder = new TupleBuilder();
        builder.writeAddress(senderAddr);
        let source = (await provider.get('getContracts', builder.build())).stack;
        let result = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
        return result;
    }
    
}