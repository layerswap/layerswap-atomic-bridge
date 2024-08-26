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

export type Notification = {
    $$type: 'Notification';
    commitId: bigint;
    hashlock: bigint;
    dstChain: string;
    dstAsset: string;
    dstAddress: string;
    srcAsset: string;
    sender: Address;
    srcReceiver: Address;
    amount: bigint;
    timelock: bigint;
}

export function storeNotification(src: Notification) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.commitId, 257);
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
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadNotification(slice: Slice) {
    let sc_0 = slice;
    let _commitId = sc_0.loadIntBig(257);
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
    return { $$type: 'Notification' as const, commitId: _commitId, hashlock: _hashlock, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, amount: _amount, timelock: _timelock };
}

function loadTupleNotification(source: TupleReader) {
    let _commitId = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _dstAddress = source.readString();
    let _srcAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    return { $$type: 'Notification' as const, commitId: _commitId, hashlock: _hashlock, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, amount: _amount, timelock: _timelock };
}

function storeTupleNotification(source: Notification) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.commitId);
    builder.writeNumber(source.hashlock);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.dstAddress);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    return builder.build();
}

function dictValueParserNotification(): DictionaryValue<Notification> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeNotification(src)).endCell());
        },
        parse: (src) => {
            return loadNotification(src.loadRef().beginParse());
        }
    }
}

export type Notify = {
    $$type: 'Notify';
    data: Notification;
}

export function storeNotify(src: Notify) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1005277634, 32);
        b_0.store(storeNotification(src.data));
    };
}

export function loadNotify(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1005277634) { throw Error('Invalid prefix'); }
    let _data = loadNotification(sc_0);
    return { $$type: 'Notify' as const, data: _data };
}

function loadTupleNotify(source: TupleReader) {
    const _data = loadTupleNotification(source.readTuple());
    return { $$type: 'Notify' as const, data: _data };
}

function storeTupleNotify(source: Notify) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleNotification(source.data));
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

export type PHTLC = {
    $$type: 'PHTLC';
    dstAddress: string;
    dstChain: string;
    dstAsset: string;
    srcAsset: string;
    sender: Address;
    srcReceiver: Address;
    timelock: bigint;
    amount: bigint;
    messenger: Address;
    locked: boolean;
    uncommitted: boolean;
    jettonMasterAddress: Slice;
    htlcJettonWalletAddress: Slice;
}

export function storePHTLC(src: PHTLC) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeStringRefTail(src.dstAddress);
        b_0.storeStringRefTail(src.dstChain);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAsset);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeAddress(src.sender);
        b_1.storeAddress(src.srcReceiver);
        b_1.storeInt(src.timelock, 257);
        let b_2 = new Builder();
        b_2.storeInt(src.amount, 257);
        b_2.storeAddress(src.messenger);
        b_2.storeBit(src.locked);
        b_2.storeBit(src.uncommitted);
        b_2.storeRef(src.jettonMasterAddress.asCell());
        b_2.storeRef(src.htlcJettonWalletAddress.asCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadPHTLC(slice: Slice) {
    let sc_0 = slice;
    let _dstAddress = sc_0.loadStringRefTail();
    let _dstChain = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAsset = sc_1.loadStringRefTail();
    let _srcAsset = sc_1.loadStringRefTail();
    let _sender = sc_1.loadAddress();
    let _srcReceiver = sc_1.loadAddress();
    let _timelock = sc_1.loadIntBig(257);
    let sc_2 = sc_1.loadRef().beginParse();
    let _amount = sc_2.loadIntBig(257);
    let _messenger = sc_2.loadAddress();
    let _locked = sc_2.loadBit();
    let _uncommitted = sc_2.loadBit();
    let _jettonMasterAddress = sc_2.loadRef().asSlice();
    let _htlcJettonWalletAddress = sc_2.loadRef().asSlice();
    return { $$type: 'PHTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, timelock: _timelock, amount: _amount, messenger: _messenger, locked: _locked, uncommitted: _uncommitted, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTuplePHTLC(source: TupleReader) {
    let _dstAddress = source.readString();
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _srcAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _timelock = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _messenger = source.readAddress();
    let _locked = source.readBoolean();
    let _uncommitted = source.readBoolean();
    let _jettonMasterAddress = source.readCell().asSlice();
    let _htlcJettonWalletAddress = source.readCell().asSlice();
    return { $$type: 'PHTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, timelock: _timelock, amount: _amount, messenger: _messenger, locked: _locked, uncommitted: _uncommitted, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTuplePHTLC(source: PHTLC) {
    let builder = new TupleBuilder();
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.timelock);
    builder.writeNumber(source.amount);
    builder.writeAddress(source.messenger);
    builder.writeBoolean(source.locked);
    builder.writeBoolean(source.uncommitted);
    builder.writeSlice(source.jettonMasterAddress.asCell());
    builder.writeSlice(source.htlcJettonWalletAddress.asCell());
    return builder.build();
}

function dictValueParserPHTLC(): DictionaryValue<PHTLC> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storePHTLC(src)).endCell());
        },
        parse: (src) => {
            return loadPHTLC(src.loadRef().beginParse());
        }
    }
}

export type CommitData = {
    $$type: 'CommitData';
    hopChains: Dictionary<bigint, StringImpl>;
    hopAssets: Dictionary<bigint, StringImpl>;
    hopAddresses: Dictionary<bigint, StringImpl>;
    dstChain: string;
    dstAsset: string;
    dstAddress: string;
    srcAsset: string;
    srcReceiver: Address;
    timelock: bigint;
    messenger: Address;
    jettonMasterAddress: Slice;
    htlcJettonWalletAddress: Slice;
}

export function storeCommitData(src: CommitData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeDict(src.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_0.storeDict(src.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        let b_1 = new Builder();
        b_1.storeDict(src.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_1.storeStringRefTail(src.dstChain);
        b_1.storeStringRefTail(src.dstAsset);
        let b_2 = new Builder();
        b_2.storeStringRefTail(src.dstAddress);
        b_2.storeStringRefTail(src.srcAsset);
        b_2.storeAddress(src.srcReceiver);
        b_2.storeInt(src.timelock, 257);
        b_2.storeAddress(src.messenger);
        b_2.storeRef(src.jettonMasterAddress.asCell());
        b_2.storeRef(src.htlcJettonWalletAddress.asCell());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadCommitData(slice: Slice) {
    let sc_0 = slice;
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_0);
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_0);
    let sc_1 = sc_0.loadRef().beginParse();
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_1);
    let _dstChain = sc_1.loadStringRefTail();
    let _dstAsset = sc_1.loadStringRefTail();
    let sc_2 = sc_1.loadRef().beginParse();
    let _dstAddress = sc_2.loadStringRefTail();
    let _srcAsset = sc_2.loadStringRefTail();
    let _srcReceiver = sc_2.loadAddress();
    let _timelock = sc_2.loadIntBig(257);
    let _messenger = sc_2.loadAddress();
    let _jettonMasterAddress = sc_2.loadRef().asSlice();
    let _htlcJettonWalletAddress = sc_2.loadRef().asSlice();
    return { $$type: 'CommitData' as const, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleCommitData(source: TupleReader) {
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _dstAddress = source.readString();
    let _srcAsset = source.readString();
    let _srcReceiver = source.readAddress();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _jettonMasterAddress = source.readCell().asSlice();
    let _htlcJettonWalletAddress = source.readCell().asSlice();
    return { $$type: 'CommitData' as const, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleCommitData(source: CommitData) {
    let builder = new TupleBuilder();
    builder.writeCell(source.hopChains.size > 0 ? beginCell().storeDictDirect(source.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAssets.size > 0 ? beginCell().storeDictDirect(source.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAddresses.size > 0 ? beginCell().storeDictDirect(source.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.dstAddress);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
    builder.writeSlice(source.jettonMasterAddress.asCell());
    builder.writeSlice(source.htlcJettonWalletAddress.asCell());
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

export type HTLC = {
    $$type: 'HTLC';
    dstAddress: string;
    dstChain: string;
    dstAsset: string;
    srcAsset: string;
    sender: Address;
    srcReceiver: Address;
    hashlock: bigint;
    secret: bigint;
    amount: bigint;
    timelock: bigint;
    redeemed: boolean;
    unlocked: boolean;
    jettonMasterAddress: Slice;
    htlcJettonWalletAddress: Slice;
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
        b_1.storeAddress(src.srcReceiver);
        b_1.storeInt(src.hashlock, 257);
        let b_2 = new Builder();
        b_2.storeInt(src.secret, 257);
        b_2.storeInt(src.amount, 257);
        b_2.storeInt(src.timelock, 257);
        b_2.storeBit(src.redeemed);
        b_2.storeBit(src.unlocked);
        b_2.storeRef(src.jettonMasterAddress.asCell());
        b_2.storeRef(src.htlcJettonWalletAddress.asCell());
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
    let _srcReceiver = sc_1.loadAddress();
    let _hashlock = sc_1.loadIntBig(257);
    let sc_2 = sc_1.loadRef().beginParse();
    let _secret = sc_2.loadIntBig(257);
    let _amount = sc_2.loadIntBig(257);
    let _timelock = sc_2.loadIntBig(257);
    let _redeemed = sc_2.loadBit();
    let _unlocked = sc_2.loadBit();
    let _jettonMasterAddress = sc_2.loadRef().asSlice();
    let _htlcJettonWalletAddress = sc_2.loadRef().asSlice();
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, hashlock: _hashlock, secret: _secret, amount: _amount, timelock: _timelock, redeemed: _redeemed, unlocked: _unlocked, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleHTLC(source: TupleReader) {
    let _dstAddress = source.readString();
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _srcAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _hashlock = source.readBigNumber();
    let _secret = source.readBigNumber();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _redeemed = source.readBoolean();
    let _unlocked = source.readBoolean();
    let _jettonMasterAddress = source.readCell().asSlice();
    let _htlcJettonWalletAddress = source.readCell().asSlice();
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, hashlock: _hashlock, secret: _secret, amount: _amount, timelock: _timelock, redeemed: _redeemed, unlocked: _unlocked, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleHTLC(source: HTLC) {
    let builder = new TupleBuilder();
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.secret);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeBoolean(source.redeemed);
    builder.writeBoolean(source.unlocked);
    builder.writeSlice(source.jettonMasterAddress.asCell());
    builder.writeSlice(source.htlcJettonWalletAddress.asCell());
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

export type LockData = {
    $$type: 'LockData';
    hashlock: bigint;
    timelock: bigint;
    srcReceiver: Address;
    srcAsset: string;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    commitId: bigint | null;
    messenger: Address | null;
    jettonMasterAddress: Slice;
    htlcJettonWalletAddress: Slice;
}

export function storeLockData(src: LockData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.hashlock, 257);
        b_0.storeInt(src.timelock, 257);
        b_0.storeAddress(src.srcReceiver);
        b_0.storeStringRefTail(src.srcAsset);
        b_0.storeStringRefTail(src.dstChain);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAddress);
        b_1.storeStringRefTail(src.dstAsset);
        if (src.commitId !== null && src.commitId !== undefined) { b_1.storeBit(true).storeInt(src.commitId, 257); } else { b_1.storeBit(false); }
        b_1.storeAddress(src.messenger);
        b_1.storeRef(src.jettonMasterAddress.asCell());
        b_1.storeRef(src.htlcJettonWalletAddress.asCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadLockData(slice: Slice) {
    let sc_0 = slice;
    let _hashlock = sc_0.loadIntBig(257);
    let _timelock = sc_0.loadIntBig(257);
    let _srcReceiver = sc_0.loadAddress();
    let _srcAsset = sc_0.loadStringRefTail();
    let _dstChain = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAddress = sc_1.loadStringRefTail();
    let _dstAsset = sc_1.loadStringRefTail();
    let _commitId = sc_1.loadBit() ? sc_1.loadIntBig(257) : null;
    let _messenger = sc_1.loadMaybeAddress();
    let _jettonMasterAddress = sc_1.loadRef().asSlice();
    let _htlcJettonWalletAddress = sc_1.loadRef().asSlice();
    return { $$type: 'LockData' as const, hashlock: _hashlock, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, commitId: _commitId, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function loadTupleLockData(source: TupleReader) {
    let _hashlock = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _commitId = source.readBigNumberOpt();
    let _messenger = source.readAddressOpt();
    let _jettonMasterAddress = source.readCell().asSlice();
    let _htlcJettonWalletAddress = source.readCell().asSlice();
    return { $$type: 'LockData' as const, hashlock: _hashlock, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, commitId: _commitId, messenger: _messenger, jettonMasterAddress: _jettonMasterAddress, htlcJettonWalletAddress: _htlcJettonWalletAddress };
}

function storeTupleLockData(source: LockData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeNumber(source.commitId);
    builder.writeAddress(source.messenger);
    builder.writeSlice(source.jettonMasterAddress.asCell());
    builder.writeSlice(source.htlcJettonWalletAddress.asCell());
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

export type LockCommitment = {
    $$type: 'LockCommitment';
    data: LockCommitmentData;
}

export function storeLockCommitment(src: LockCommitment) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1558004185, 32);
        b_0.store(storeLockCommitmentData(src.data));
    };
}

export function loadLockCommitment(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1558004185) { throw Error('Invalid prefix'); }
    let _data = loadLockCommitmentData(sc_0);
    return { $$type: 'LockCommitment' as const, data: _data };
}

function loadTupleLockCommitment(source: TupleReader) {
    const _data = loadTupleLockCommitmentData(source.readTuple());
    return { $$type: 'LockCommitment' as const, data: _data };
}

function storeTupleLockCommitment(source: LockCommitment) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleLockCommitmentData(source.data));
    return builder.build();
}

function dictValueParserLockCommitment(): DictionaryValue<LockCommitment> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLockCommitment(src)).endCell());
        },
        parse: (src) => {
            return loadLockCommitment(src.loadRef().beginParse());
        }
    }
}

export type LockCommitmentData = {
    $$type: 'LockCommitmentData';
    commitId: bigint;
    hashlock: bigint;
    timelock: bigint;
}

export function storeLockCommitmentData(src: LockCommitmentData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.commitId, 257);
        b_0.storeInt(src.hashlock, 257);
        b_0.storeInt(src.timelock, 257);
    };
}

export function loadLockCommitmentData(slice: Slice) {
    let sc_0 = slice;
    let _commitId = sc_0.loadIntBig(257);
    let _hashlock = sc_0.loadIntBig(257);
    let _timelock = sc_0.loadIntBig(257);
    return { $$type: 'LockCommitmentData' as const, commitId: _commitId, hashlock: _hashlock, timelock: _timelock };
}

function loadTupleLockCommitmentData(source: TupleReader) {
    let _commitId = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _timelock = source.readBigNumber();
    return { $$type: 'LockCommitmentData' as const, commitId: _commitId, hashlock: _hashlock, timelock: _timelock };
}

function storeTupleLockCommitmentData(source: LockCommitmentData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.commitId);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    return builder.build();
}

function dictValueParserLockCommitmentData(): DictionaryValue<LockCommitmentData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLockCommitmentData(src)).endCell());
        },
        parse: (src) => {
            return loadLockCommitmentData(src.loadRef().beginParse());
        }
    }
}

export type Uncommit = {
    $$type: 'Uncommit';
    data: UncommitData;
}

export function storeUncommit(src: Uncommit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2841160739, 32);
        b_0.store(storeUncommitData(src.data));
    };
}

export function loadUncommit(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2841160739) { throw Error('Invalid prefix'); }
    let _data = loadUncommitData(sc_0);
    return { $$type: 'Uncommit' as const, data: _data };
}

function loadTupleUncommit(source: TupleReader) {
    const _data = loadTupleUncommitData(source.readTuple());
    return { $$type: 'Uncommit' as const, data: _data };
}

function storeTupleUncommit(source: Uncommit) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleUncommitData(source.data));
    return builder.build();
}

function dictValueParserUncommit(): DictionaryValue<Uncommit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUncommit(src)).endCell());
        },
        parse: (src) => {
            return loadUncommit(src.loadRef().beginParse());
        }
    }
}

export type UncommitData = {
    $$type: 'UncommitData';
    commitId: bigint;
}

export function storeUncommitData(src: UncommitData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.commitId, 257);
    };
}

export function loadUncommitData(slice: Slice) {
    let sc_0 = slice;
    let _commitId = sc_0.loadIntBig(257);
    return { $$type: 'UncommitData' as const, commitId: _commitId };
}

function loadTupleUncommitData(source: TupleReader) {
    let _commitId = source.readBigNumber();
    return { $$type: 'UncommitData' as const, commitId: _commitId };
}

function storeTupleUncommitData(source: UncommitData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.commitId);
    return builder.build();
}

function dictValueParserUncommitData(): DictionaryValue<UncommitData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUncommitData(src)).endCell());
        },
        parse: (src) => {
            return loadUncommitData(src.loadRef().beginParse());
        }
    }
}

export type Redeem = {
    $$type: 'Redeem';
    data: RedeemData;
}

export function storeRedeem(src: Redeem) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1972220037, 32);
        b_0.store(storeRedeemData(src.data));
    };
}

export function loadRedeem(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1972220037) { throw Error('Invalid prefix'); }
    let _data = loadRedeemData(sc_0);
    return { $$type: 'Redeem' as const, data: _data };
}

function loadTupleRedeem(source: TupleReader) {
    const _data = loadTupleRedeemData(source.readTuple());
    return { $$type: 'Redeem' as const, data: _data };
}

function storeTupleRedeem(source: Redeem) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleRedeemData(source.data));
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

export type RedeemData = {
    $$type: 'RedeemData';
    lockId: bigint;
    secret: bigint;
}

export function storeRedeemData(src: RedeemData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.lockId, 257);
        b_0.storeInt(src.secret, 257);
    };
}

export function loadRedeemData(slice: Slice) {
    let sc_0 = slice;
    let _lockId = sc_0.loadIntBig(257);
    let _secret = sc_0.loadIntBig(257);
    return { $$type: 'RedeemData' as const, lockId: _lockId, secret: _secret };
}

function loadTupleRedeemData(source: TupleReader) {
    let _lockId = source.readBigNumber();
    let _secret = source.readBigNumber();
    return { $$type: 'RedeemData' as const, lockId: _lockId, secret: _secret };
}

function storeTupleRedeemData(source: RedeemData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.lockId);
    builder.writeNumber(source.secret);
    return builder.build();
}

function dictValueParserRedeemData(): DictionaryValue<RedeemData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeRedeemData(src)).endCell());
        },
        parse: (src) => {
            return loadRedeemData(src.loadRef().beginParse());
        }
    }
}

export type Unlock = {
    $$type: 'Unlock';
    data: UnlockData;
}

export function storeUnlock(src: Unlock) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2910985977, 32);
        b_0.store(storeUnlockData(src.data));
    };
}

export function loadUnlock(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2910985977) { throw Error('Invalid prefix'); }
    let _data = loadUnlockData(sc_0);
    return { $$type: 'Unlock' as const, data: _data };
}

function loadTupleUnlock(source: TupleReader) {
    const _data = loadTupleUnlockData(source.readTuple());
    return { $$type: 'Unlock' as const, data: _data };
}

function storeTupleUnlock(source: Unlock) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleUnlockData(source.data));
    return builder.build();
}

function dictValueParserUnlock(): DictionaryValue<Unlock> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUnlock(src)).endCell());
        },
        parse: (src) => {
            return loadUnlock(src.loadRef().beginParse());
        }
    }
}

export type UnlockData = {
    $$type: 'UnlockData';
    hashlock: bigint;
}

export function storeUnlockData(src: UnlockData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.hashlock, 257);
    };
}

export function loadUnlockData(slice: Slice) {
    let sc_0 = slice;
    let _hashlock = sc_0.loadIntBig(257);
    return { $$type: 'UnlockData' as const, hashlock: _hashlock };
}

function loadTupleUnlockData(source: TupleReader) {
    let _hashlock = source.readBigNumber();
    return { $$type: 'UnlockData' as const, hashlock: _hashlock };
}

function storeTupleUnlockData(source: UnlockData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.hashlock);
    return builder.build();
}

function dictValueParserUnlockData(): DictionaryValue<UnlockData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeUnlockData(src)).endCell());
        },
        parse: (src) => {
            return loadUnlockData(src.loadRef().beginParse());
        }
    }
}

export type CommitId = {
    $$type: 'CommitId';
    commitId: bigint;
}

export function storeCommitId(src: CommitId) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(787237729, 32);
        b_0.storeInt(src.commitId, 257);
    };
}

export function loadCommitId(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 787237729) { throw Error('Invalid prefix'); }
    let _commitId = sc_0.loadIntBig(257);
    return { $$type: 'CommitId' as const, commitId: _commitId };
}

function loadTupleCommitId(source: TupleReader) {
    let _commitId = source.readBigNumber();
    return { $$type: 'CommitId' as const, commitId: _commitId };
}

function storeTupleCommitId(source: CommitId) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.commitId);
    return builder.build();
}

function dictValueParserCommitId(): DictionaryValue<CommitId> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCommitId(src)).endCell());
        },
        parse: (src) => {
            return loadCommitId(src.loadRef().beginParse());
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

 type HashedTimeLockTON_init_args = {
    $$type: 'HashedTimeLockTON_init_args';
}

function initHashedTimeLockTON_init_args(src: HashedTimeLockTON_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
    };
}

async function HashedTimeLockTON_init() {
    const __code = Cell.fromBase64('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');
    const __system = Cell.fromBase64('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');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initHashedTimeLockTON_init_args({ $$type: 'HashedTimeLockTON_init_args' })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const HashedTimeLockTON_errors: { [key: number]: { message: string } } = {
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
    1503: { message: `Already Unlocked` },
    4670: { message: `Funds Not Sent` },
    6007: { message: `Lock Already Exists` },
    6272: { message: `Lock Does Not Exist` },
    21683: { message: `Not Future Timelock` },
    22150: { message: `Commit Already Exists` },
    30789: { message: `Commit Does Not Exist` },
    31687: { message: `No Allowance` },
    38239: { message: `Not Passed Timelock` },
    42324: { message: `Already Uncommitted` },
    46722: { message: `Already Locked` },
    46887: { message: `Already Redeemed` },
    50918: { message: `Hashlock Not Match` },
}

const HashedTimeLockTON_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"TokenTransfer","header":260734629,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"destination","type":{"kind":"simple","type":"address","optional":false}},{"name":"response_destination","type":{"kind":"simple","type":"address","optional":false}},{"name":"custom_payload","type":{"kind":"simple","type":"cell","optional":true}},{"name":"forward_ton_amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"forward_payload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"TokenNotification","header":1935855772,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"amount","type":{"kind":"simple","type":"uint","optional":false,"format":"coins"}},{"name":"from","type":{"kind":"simple","type":"address","optional":false}},{"name":"forward_payload","type":{"kind":"simple","type":"slice","optional":false,"format":"remainder"}}]},
    {"name":"Notification","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Notify","header":1005277634,"fields":[{"name":"data","type":{"kind":"simple","type":"Notification","optional":false}}]},
    {"name":"PHTLC","header":null,"fields":[{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"locked","type":{"kind":"simple","type":"bool","optional":false}},{"name":"uncommitted","type":{"kind":"simple","type":"bool","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"slice","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"CommitData","header":null,"fields":[{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"slice","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"HTLC","header":null,"fields":[{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"redeemed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"unlocked","type":{"kind":"simple","type":"bool","optional":false}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"slice","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"LockData","header":null,"fields":[{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"commitId","type":{"kind":"simple","type":"int","optional":true,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":true}},{"name":"jettonMasterAddress","type":{"kind":"simple","type":"slice","optional":false}},{"name":"htlcJettonWalletAddress","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"LockCommitment","header":1558004185,"fields":[{"name":"data","type":{"kind":"simple","type":"LockCommitmentData","optional":false}}]},
    {"name":"LockCommitmentData","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Uncommit","header":2841160739,"fields":[{"name":"data","type":{"kind":"simple","type":"UncommitData","optional":false}}]},
    {"name":"UncommitData","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Redeem","header":1972220037,"fields":[{"name":"data","type":{"kind":"simple","type":"RedeemData","optional":false}}]},
    {"name":"RedeemData","header":null,"fields":[{"name":"lockId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Unlock","header":2910985977,"fields":[{"name":"data","type":{"kind":"simple","type":"UnlockData","optional":false}}]},
    {"name":"UnlockData","header":null,"fields":[{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"CommitId","header":787237729,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"StringImpl","header":null,"fields":[{"name":"data","type":{"kind":"simple","type":"string","optional":false}}]},
]

const HashedTimeLockTON_getters: ABIGetter[] = [
    {"name":"getLockCDetails","arguments":[{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"HTLC","optional":true}},
    {"name":"getCommitDetails","arguments":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"PHTLC","optional":true}},
    {"name":"commitsLength","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"locksLength","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"lockIdToCommitIdLength","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getCommits","arguments":[{"name":"senderAddr","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"dict","key":"int","value":"int"}},
    {"name":"getLocks","arguments":[{"name":"senderAddr","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"dict","key":"int","value":"int"}},
    {"name":"getLockIdByCommitId","arguments":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"int","optional":true,"format":257}},
]

export const HashedTimeLockTON_getterMapping: { [key: string]: string } = {
    'getLockCDetails': 'getGetLockCDetails',
    'getCommitDetails': 'getGetCommitDetails',
    'commitsLength': 'getCommitsLength',
    'locksLength': 'getLocksLength',
    'lockIdToCommitIdLength': 'getLockIdToCommitIdLength',
    'getCommits': 'getGetCommits',
    'getLocks': 'getGetLocks',
    'getLockIdByCommitId': 'getGetLockIdByCommitId',
}

const HashedTimeLockTON_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"TokenNotification"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Uncommit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"LockCommitment"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Redeem"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Unlock"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export class HashedTimeLockTON implements Contract {
    
    static async init() {
        return await HashedTimeLockTON_init();
    }
    
    static async fromInit() {
        const init = await HashedTimeLockTON_init();
        const address = contractAddress(0, init);
        return new HashedTimeLockTON(address, init);
    }
    
    static fromAddress(address: Address) {
        return new HashedTimeLockTON(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  HashedTimeLockTON_types,
        getters: HashedTimeLockTON_getters,
        receivers: HashedTimeLockTON_receivers,
        errors: HashedTimeLockTON_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: TokenNotification | Uncommit | LockCommitment | Redeem | Unlock | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'TokenNotification') {
            body = beginCell().store(storeTokenNotification(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Uncommit') {
            body = beginCell().store(storeUncommit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'LockCommitment') {
            body = beginCell().store(storeLockCommitment(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Redeem') {
            body = beginCell().store(storeRedeem(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Unlock') {
            body = beginCell().store(storeUnlock(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
    async getGetLockCDetails(provider: ContractProvider, hashlock: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(hashlock);
        let source = (await provider.get('getLockCDetails', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTupleHTLC(result_p) : null;
        return result;
    }
    
    async getGetCommitDetails(provider: ContractProvider, commitId: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(commitId);
        let source = (await provider.get('getCommitDetails', builder.build())).stack;
        const result_p = source.readTupleOpt();
        const result = result_p ? loadTuplePHTLC(result_p) : null;
        return result;
    }
    
    async getCommitsLength(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('commitsLength', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getLocksLength(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('locksLength', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getLockIdToCommitIdLength(provider: ContractProvider) {
        let builder = new TupleBuilder();
        let source = (await provider.get('lockIdToCommitIdLength', builder.build())).stack;
        let result = source.readBigNumber();
        return result;
    }
    
    async getGetCommits(provider: ContractProvider, senderAddr: Address) {
        let builder = new TupleBuilder();
        builder.writeAddress(senderAddr);
        let source = (await provider.get('getCommits', builder.build())).stack;
        let result = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
        return result;
    }
    
    async getGetLocks(provider: ContractProvider, senderAddr: Address) {
        let builder = new TupleBuilder();
        builder.writeAddress(senderAddr);
        let source = (await provider.get('getLocks', builder.build())).stack;
        let result = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), Dictionary.Values.BigInt(257), source.readCellOpt());
        return result;
    }
    
    async getGetLockIdByCommitId(provider: ContractProvider, commitId: bigint) {
        let builder = new TupleBuilder();
        builder.writeNumber(commitId);
        let source = (await provider.get('getLockIdByCommitId', builder.build())).stack;
        let result = source.readBigNumberOpt();
        return result;
    }
    
}