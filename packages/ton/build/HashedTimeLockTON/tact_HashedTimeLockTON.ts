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
    return { $$type: 'PHTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, timelock: _timelock, amount: _amount, messenger: _messenger, locked: _locked, uncommitted: _uncommitted };
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
    return { $$type: 'PHTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, timelock: _timelock, amount: _amount, messenger: _messenger, locked: _locked, uncommitted: _uncommitted };
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
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, hashlock: _hashlock, secret: _secret, amount: _amount, timelock: _timelock, redeemed: _redeemed, unlocked: _unlocked };
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
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, srcReceiver: _srcReceiver, hashlock: _hashlock, secret: _secret, amount: _amount, timelock: _timelock, redeemed: _redeemed, unlocked: _unlocked };
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

export type Commit = {
    $$type: 'Commit';
    data: CommitData;
}

export function storeCommit(src: Commit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(458640785, 32);
        b_0.store(storeCommitData(src.data));
    };
}

export function loadCommit(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 458640785) { throw Error('Invalid prefix'); }
    let _data = loadCommitData(sc_0);
    return { $$type: 'Commit' as const, data: _data };
}

function loadTupleCommit(source: TupleReader) {
    const _data = loadTupleCommitData(source.readTuple());
    return { $$type: 'Commit' as const, data: _data };
}

function storeTupleCommit(source: Commit) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleCommitData(source.data));
    return builder.build();
}

function dictValueParserCommit(): DictionaryValue<Commit> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeCommit(src)).endCell());
        },
        parse: (src) => {
            return loadCommit(src.loadRef().beginParse());
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
        b_1.storeDict(src.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        let b_2 = new Builder();
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
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_1);
    let sc_2 = sc_1.loadRef().beginParse();
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    return { $$type: 'CommitData' as const, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, messenger: _messenger, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function loadTupleCommitData(source: TupleReader) {
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _dstAddress = source.readString();
    let _srcAsset = source.readString();
    let _srcReceiver = source.readAddress();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    return { $$type: 'CommitData' as const, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, messenger: _messenger, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
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

export type Lock = {
    $$type: 'Lock';
    data: LockData;
}

export function storeLock(src: Lock) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(317164721, 32);
        b_0.store(storeLockData(src.data));
    };
}

export function loadLock(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 317164721) { throw Error('Invalid prefix'); }
    let _data = loadLockData(sc_0);
    return { $$type: 'Lock' as const, data: _data };
}

function loadTupleLock(source: TupleReader) {
    const _data = loadTupleLockData(source.readTuple());
    return { $$type: 'Lock' as const, data: _data };
}

function storeTupleLock(source: Lock) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleLockData(source.data));
    return builder.build();
}

function dictValueParserLock(): DictionaryValue<Lock> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLock(src)).endCell());
        },
        parse: (src) => {
            return loadLock(src.loadRef().beginParse());
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
    return { $$type: 'LockData' as const, hashlock: _hashlock, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, commitId: _commitId, messenger: _messenger };
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
    return { $$type: 'LockData' as const, hashlock: _hashlock, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, commitId: _commitId, messenger: _messenger };
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

export type LockCommitmentSig = {
    $$type: 'LockCommitmentSig';
    data: LockCommitmentSigData;
}

export function storeLockCommitmentSig(src: LockCommitmentSig) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3252164863, 32);
        b_0.store(storeLockCommitmentSigData(src.data));
    };
}

export function loadLockCommitmentSig(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3252164863) { throw Error('Invalid prefix'); }
    let _data = loadLockCommitmentSigData(sc_0);
    return { $$type: 'LockCommitmentSig' as const, data: _data };
}

function loadTupleLockCommitmentSig(source: TupleReader) {
    const _data = loadTupleLockCommitmentSigData(source.readTuple());
    return { $$type: 'LockCommitmentSig' as const, data: _data };
}

function storeTupleLockCommitmentSig(source: LockCommitmentSig) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleLockCommitmentSigData(source.data));
    return builder.build();
}

function dictValueParserLockCommitmentSig(): DictionaryValue<LockCommitmentSig> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLockCommitmentSig(src)).endCell());
        },
        parse: (src) => {
            return loadLockCommitmentSig(src.loadRef().beginParse());
        }
    }
}

export type LockCommitmentSigData = {
    $$type: 'LockCommitmentSigData';
    commitId: bigint;
    data: Slice;
    signature: Slice;
    publicKey: bigint;
}

export function storeLockCommitmentSigData(src: LockCommitmentSigData) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.commitId, 257);
        b_0.storeRef(src.data.asCell());
        b_0.storeRef(src.signature.asCell());
        b_0.storeInt(src.publicKey, 257);
    };
}

export function loadLockCommitmentSigData(slice: Slice) {
    let sc_0 = slice;
    let _commitId = sc_0.loadIntBig(257);
    let _data = sc_0.loadRef().asSlice();
    let _signature = sc_0.loadRef().asSlice();
    let _publicKey = sc_0.loadIntBig(257);
    return { $$type: 'LockCommitmentSigData' as const, commitId: _commitId, data: _data, signature: _signature, publicKey: _publicKey };
}

function loadTupleLockCommitmentSigData(source: TupleReader) {
    let _commitId = source.readBigNumber();
    let _data = source.readCell().asSlice();
    let _signature = source.readCell().asSlice();
    let _publicKey = source.readBigNumber();
    return { $$type: 'LockCommitmentSigData' as const, commitId: _commitId, data: _data, signature: _signature, publicKey: _publicKey };
}

function storeTupleLockCommitmentSigData(source: LockCommitmentSigData) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.commitId);
    builder.writeSlice(source.data.asCell());
    builder.writeSlice(source.signature.asCell());
    builder.writeNumber(source.publicKey);
    return builder.build();
}

function dictValueParserLockCommitmentSigData(): DictionaryValue<LockCommitmentSigData> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeLockCommitmentSigData(src)).endCell());
        },
        parse: (src) => {
            return loadLockCommitmentSigData(src.loadRef().beginParse());
        }
    }
}

export type TokenCommitted = {
    $$type: 'TokenCommitted';
    commitId: bigint;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    sender: Address;
    srcReceiver: Address;
    srcAsset: string;
    amount: bigint;
    timelock: bigint;
    messenger: Address;
    hopChains: Dictionary<bigint, StringImpl>;
    hopAssets: Dictionary<bigint, StringImpl>;
    hopAddresses: Dictionary<bigint, StringImpl>;
}

export function storeTokenCommitted(src: TokenCommitted) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1912207274, 32);
        b_0.storeInt(src.commitId, 257);
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
        b_2.storeDict(src.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_2.storeDict(src.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_2.storeDict(src.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTokenCommitted(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1912207274) { throw Error('Invalid prefix'); }
    let _commitId = sc_0.loadIntBig(257);
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
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    return { $$type: 'TokenCommitted' as const, commitId: _commitId, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function loadTupleTokenCommitted(source: TupleReader) {
    let _commitId = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddress();
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    return { $$type: 'TokenCommitted' as const, commitId: _commitId, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function storeTupleTokenCommitted(source: TokenCommitted) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.commitId);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
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
    hashlock: bigint;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    sender: Address;
    srcReceiver: Address;
    srcAsset: string;
    amount: bigint;
    timelock: bigint;
    messenger: Address | null;
    commitId: bigint | null;
}

export function storeTokenLocked(src: TokenLocked) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2511348125, 32);
        b_0.storeInt(src.hashlock, 257);
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
        if (src.commitId !== null && src.commitId !== undefined) { b_2.storeBit(true).storeInt(src.commitId, 257); } else { b_2.storeBit(false); }
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTokenLocked(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2511348125) { throw Error('Invalid prefix'); }
    let _hashlock = sc_0.loadIntBig(257);
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
    let _messenger = sc_2.loadMaybeAddress();
    let _commitId = sc_2.loadBit() ? sc_2.loadIntBig(257) : null;
    return { $$type: 'TokenLocked' as const, hashlock: _hashlock, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, commitId: _commitId };
}

function loadTupleTokenLocked(source: TupleReader) {
    let _hashlock = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _messenger = source.readAddressOpt();
    let _commitId = source.readBigNumberOpt();
    return { $$type: 'TokenLocked' as const, hashlock: _hashlock, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, messenger: _messenger, commitId: _commitId };
}

function storeTupleTokenLocked(source: TokenLocked) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.hashlock);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.messenger);
    builder.writeNumber(source.commitId);
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
    20173: { message: `Commitment does not exist` },
    21683: { message: `Not Future Timelock` },
    22150: { message: `Commit Already Exists` },
    30789: { message: `Commit Does Not Exist` },
    31687: { message: `No Allowance` },
    38239: { message: `Not Passed Timelock` },
    42324: { message: `Already Uncommitted` },
    46722: { message: `Already Locked` },
    46887: { message: `Already Redeemed` },
    48401: { message: `Invalid signature` },
    50918: { message: `Hashlock Not Match` },
}

const HashedTimeLockTON_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"Notification","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Notify","header":1005277634,"fields":[{"name":"data","type":{"kind":"simple","type":"Notification","optional":false}}]},
    {"name":"PHTLC","header":null,"fields":[{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"locked","type":{"kind":"simple","type":"bool","optional":false}},{"name":"uncommitted","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"HTLC","header":null,"fields":[{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"redeemed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"unlocked","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Commit","header":458640785,"fields":[{"name":"data","type":{"kind":"simple","type":"CommitData","optional":false}}]},
    {"name":"CommitData","header":null,"fields":[{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}}]},
    {"name":"LockCommitment","header":1558004185,"fields":[{"name":"data","type":{"kind":"simple","type":"LockCommitmentData","optional":false}}]},
    {"name":"LockCommitmentData","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Uncommit","header":2841160739,"fields":[{"name":"data","type":{"kind":"simple","type":"UncommitData","optional":false}}]},
    {"name":"UncommitData","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Lock","header":317164721,"fields":[{"name":"data","type":{"kind":"simple","type":"LockData","optional":false}}]},
    {"name":"LockData","header":null,"fields":[{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"commitId","type":{"kind":"simple","type":"int","optional":true,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":true}}]},
    {"name":"Redeem","header":1972220037,"fields":[{"name":"data","type":{"kind":"simple","type":"RedeemData","optional":false}}]},
    {"name":"RedeemData","header":null,"fields":[{"name":"lockId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Unlock","header":2910985977,"fields":[{"name":"data","type":{"kind":"simple","type":"UnlockData","optional":false}}]},
    {"name":"UnlockData","header":null,"fields":[{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"LockCommitmentSig","header":3252164863,"fields":[{"name":"data","type":{"kind":"simple","type":"LockCommitmentSigData","optional":false}}]},
    {"name":"LockCommitmentSigData","header":null,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"data","type":{"kind":"simple","type":"slice","optional":false}},{"name":"signature","type":{"kind":"simple","type":"slice","optional":false}},{"name":"publicKey","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"TokenCommitted","header":1912207274,"fields":[{"name":"commitId","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":false}},{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}}]},
    {"name":"TokenLocked","header":2511348125,"fields":[{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"messenger","type":{"kind":"simple","type":"address","optional":true}},{"name":"commitId","type":{"kind":"simple","type":"int","optional":true,"format":257}}]},
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
    {"receiver":"internal","message":{"kind":"typed","type":"Commit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Uncommit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"LockCommitment"}},
    {"receiver":"internal","message":{"kind":"typed","type":"LockCommitmentSig"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Lock"}},
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
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Commit | Uncommit | LockCommitment | LockCommitmentSig | Lock | Redeem | Unlock | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Commit') {
            body = beginCell().store(storeCommit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Uncommit') {
            body = beginCell().store(storeUncommit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'LockCommitment') {
            body = beginCell().store(storeLockCommitment(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'LockCommitmentSig') {
            body = beginCell().store(storeLockCommitmentSig(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Lock') {
            body = beginCell().store(storeLock(message)).endCell();
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