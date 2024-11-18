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
    redeemed: boolean;
    refunded: boolean;
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
        b_3.storeBit(src.redeemed);
        b_3.storeBit(src.refunded);
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
    let _redeemed = sc_3.loadBit();
    let _refunded = sc_3.loadBit();
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, senderPubKey: _senderPubKey, srcReceiver: _srcReceiver, secret: _secret, hashlock: _hashlock, amount: _amount, timelock: _timelock, redeemed: _redeemed, refunded: _refunded };
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
    let _redeemed = source.readBoolean();
    let _refunded = source.readBoolean();
    return { $$type: 'HTLC' as const, dstAddress: _dstAddress, dstChain: _dstChain, dstAsset: _dstAsset, srcAsset: _srcAsset, sender: _sender, senderPubKey: _senderPubKey, srcReceiver: _srcReceiver, secret: _secret, hashlock: _hashlock, amount: _amount, timelock: _timelock, redeemed: _redeemed, refunded: _refunded };
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
    builder.writeBoolean(source.redeemed);
    builder.writeBoolean(source.refunded);
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
    dstChain: string;
    dstAsset: string;
    dstAddress: string;
    srcAsset: string;
    srcReceiver: Address;
    timelock: bigint;
    senderPubKey: bigint;
    hopChains: Dictionary<bigint, StringImpl>;
    hopAssets: Dictionary<bigint, StringImpl>;
    hopAddresses: Dictionary<bigint, StringImpl>;
}

export function storeCommit(src: Commit) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(458640785, 32);
        b_0.storeStringRefTail(src.dstChain);
        b_0.storeStringRefTail(src.dstAsset);
        let b_1 = new Builder();
        b_1.storeStringRefTail(src.dstAddress);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeAddress(src.srcReceiver);
        b_1.storeInt(src.timelock, 257);
        b_1.storeInt(src.senderPubKey, 257);
        b_1.storeDict(src.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        let b_2 = new Builder();
        b_2.storeDict(src.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_2.storeDict(src.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl());
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadCommit(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 458640785) { throw Error('Invalid prefix'); }
    let _dstChain = sc_0.loadStringRefTail();
    let _dstAsset = sc_0.loadStringRefTail();
    let sc_1 = sc_0.loadRef().beginParse();
    let _dstAddress = sc_1.loadStringRefTail();
    let _srcAsset = sc_1.loadStringRefTail();
    let _srcReceiver = sc_1.loadAddress();
    let _timelock = sc_1.loadIntBig(257);
    let _senderPubKey = sc_1.loadIntBig(257);
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_1);
    let sc_2 = sc_1.loadRef().beginParse();
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    return { $$type: 'Commit' as const, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function loadTupleCommit(source: TupleReader) {
    let _dstChain = source.readString();
    let _dstAsset = source.readString();
    let _dstAddress = source.readString();
    let _srcAsset = source.readString();
    let _srcReceiver = source.readAddress();
    let _timelock = source.readBigNumber();
    let _senderPubKey = source.readBigNumber();
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    return { $$type: 'Commit' as const, dstChain: _dstChain, dstAsset: _dstAsset, dstAddress: _dstAddress, srcAsset: _srcAsset, srcReceiver: _srcReceiver, timelock: _timelock, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
}

function storeTupleCommit(source: Commit) {
    let builder = new TupleBuilder();
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAsset);
    builder.writeString(source.dstAddress);
    builder.writeString(source.srcAsset);
    builder.writeAddress(source.srcReceiver);
    builder.writeNumber(source.timelock);
    builder.writeNumber(source.senderPubKey);
    builder.writeCell(source.hopChains.size > 0 ? beginCell().storeDictDirect(source.hopChains, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAssets.size > 0 ? beginCell().storeDictDirect(source.hopAssets, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
    builder.writeCell(source.hopAddresses.size > 0 ? beginCell().storeDictDirect(source.hopAddresses, Dictionary.Keys.BigInt(257), dictValueParserStringImpl()).endCell() : null);
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

export type AddLockSig = {
    $$type: 'AddLockSig';
    data: Slice;
    signature: Slice;
}

export function storeAddLockSig(src: AddLockSig) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3252164863, 32);
        b_0.storeRef(src.data.asCell());
        b_0.storeRef(src.signature.asCell());
    };
}

export function loadAddLockSig(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3252164863) { throw Error('Invalid prefix'); }
    let _data = sc_0.loadRef().asSlice();
    let _signature = sc_0.loadRef().asSlice();
    return { $$type: 'AddLockSig' as const, data: _data, signature: _signature };
}

function loadTupleAddLockSig(source: TupleReader) {
    let _data = source.readCell().asSlice();
    let _signature = source.readCell().asSlice();
    return { $$type: 'AddLockSig' as const, data: _data, signature: _signature };
}

function storeTupleAddLockSig(source: AddLockSig) {
    let builder = new TupleBuilder();
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

export type Lock = {
    $$type: 'Lock';
    Id: bigint;
    hashlock: bigint;
    timelock: bigint;
    srcReceiver: Address;
    srcAsset: string;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
}

export function storeLock(src: Lock) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(317164721, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeInt(src.hashlock, 257);
        b_0.storeInt(src.timelock, 257);
        let b_1 = new Builder();
        b_1.storeAddress(src.srcReceiver);
        b_1.storeStringRefTail(src.srcAsset);
        b_1.storeStringRefTail(src.dstChain);
        b_1.storeStringRefTail(src.dstAddress);
        b_1.storeStringRefTail(src.dstAsset);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadLock(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 317164721) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _hashlock = sc_0.loadIntBig(257);
    let _timelock = sc_0.loadIntBig(257);
    let sc_1 = sc_0.loadRef().beginParse();
    let _srcReceiver = sc_1.loadAddress();
    let _srcAsset = sc_1.loadStringRefTail();
    let _dstChain = sc_1.loadStringRefTail();
    let _dstAddress = sc_1.loadStringRefTail();
    let _dstAsset = sc_1.loadStringRefTail();
    return { $$type: 'Lock' as const, Id: _Id, hashlock: _hashlock, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset };
}

function loadTupleLock(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    return { $$type: 'Lock' as const, Id: _Id, hashlock: _hashlock, timelock: _timelock, srcReceiver: _srcReceiver, srcAsset: _srcAsset, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset };
}

function storeTupleLock(source: Lock) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeNumber(source.hashlock);
    builder.writeNumber(source.timelock);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
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
    senderPubKey: bigint;
    hopChains: Dictionary<bigint, StringImpl>;
    hopAssets: Dictionary<bigint, StringImpl>;
    hopAddresses: Dictionary<bigint, StringImpl>;
}

export function storeTokenCommitted(src: TokenCommitted) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1912207274, 32);
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
        b_2.storeInt(src.senderPubKey, 257);
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
    let _senderPubKey = sc_2.loadIntBig(257);
    let _hopChains = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAssets = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    let _hopAddresses = Dictionary.load(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), sc_2);
    return { $$type: 'TokenCommitted' as const, Id: _Id, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
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
    let _senderPubKey = source.readBigNumber();
    let _hopChains = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAssets = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    let _hopAddresses = Dictionary.loadDirect(Dictionary.Keys.BigInt(257), dictValueParserStringImpl(), source.readCellOpt());
    return { $$type: 'TokenCommitted' as const, Id: _Id, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock, senderPubKey: _senderPubKey, hopChains: _hopChains, hopAssets: _hopAssets, hopAddresses: _hopAddresses };
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
    hashlock: bigint;
    dstChain: string;
    dstAddress: string;
    dstAsset: string;
    sender: Address;
    srcReceiver: Address;
    srcAsset: string;
    amount: bigint;
    timelock: bigint;
}

export function storeTokenLocked(src: TokenLocked) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(2511348125, 32);
        b_0.storeInt(src.Id, 257);
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
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTokenLocked(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 2511348125) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
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
    return { $$type: 'TokenLocked' as const, Id: _Id, hashlock: _hashlock, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock };
}

function loadTupleTokenLocked(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _dstChain = source.readString();
    let _dstAddress = source.readString();
    let _dstAsset = source.readString();
    let _sender = source.readAddress();
    let _srcReceiver = source.readAddress();
    let _srcAsset = source.readString();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    return { $$type: 'TokenLocked' as const, Id: _Id, hashlock: _hashlock, dstChain: _dstChain, dstAddress: _dstAddress, dstAsset: _dstAsset, sender: _sender, srcReceiver: _srcReceiver, srcAsset: _srcAsset, amount: _amount, timelock: _timelock };
}

function storeTupleTokenLocked(source: TokenLocked) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeNumber(source.hashlock);
    builder.writeString(source.dstChain);
    builder.writeString(source.dstAddress);
    builder.writeString(source.dstAsset);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.srcReceiver);
    builder.writeString(source.srcAsset);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
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

export type TokenRedeemed = {
    $$type: 'TokenRedeemed';
    Id: bigint;
    redeemAddress: Address;
    secret: bigint;
    hashlock: bigint;
}

export function storeTokenRedeemed(src: TokenRedeemed) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(1701105609, 32);
        b_0.storeInt(src.Id, 257);
        b_0.storeAddress(src.redeemAddress);
        b_0.storeInt(src.secret, 257);
        let b_1 = new Builder();
        b_1.storeInt(src.hashlock, 257);
        b_0.storeRef(b_1.endCell());
    };
}

export function loadTokenRedeemed(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 1701105609) { throw Error('Invalid prefix'); }
    let _Id = sc_0.loadIntBig(257);
    let _redeemAddress = sc_0.loadAddress();
    let _secret = sc_0.loadIntBig(257);
    let sc_1 = sc_0.loadRef().beginParse();
    let _hashlock = sc_1.loadIntBig(257);
    return { $$type: 'TokenRedeemed' as const, Id: _Id, redeemAddress: _redeemAddress, secret: _secret, hashlock: _hashlock };
}

function loadTupleTokenRedeemed(source: TupleReader) {
    let _Id = source.readBigNumber();
    let _redeemAddress = source.readAddress();
    let _secret = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    return { $$type: 'TokenRedeemed' as const, Id: _Id, redeemAddress: _redeemAddress, secret: _secret, hashlock: _hashlock };
}

function storeTupleTokenRedeemed(source: TokenRedeemed) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.Id);
    builder.writeAddress(source.redeemAddress);
    builder.writeNumber(source.secret);
    builder.writeNumber(source.hashlock);
    return builder.build();
}

function dictValueParserTokenRedeemed(): DictionaryValue<TokenRedeemed> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeTokenRedeemed(src)).endCell());
        },
        parse: (src) => {
            return loadTokenRedeemed(src.loadRef().beginParse());
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

 type LayerswapV8_init_args = {
    $$type: 'LayerswapV8_init_args';
}

function initLayerswapV8_init_args(src: LayerswapV8_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
    };
}

async function LayerswapV8_init() {
    const __code = Cell.fromBase64('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');
    const __system = Cell.fromBase64('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');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initLayerswapV8_init_args({ $$type: 'LayerswapV8_init_args' })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const LayerswapV8_errors: { [key: number]: { message: string } } = {
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
    30789: { message: `Commit Does Not Exist` },
    31687: { message: `No Allowance` },
    38239: { message: `Not Passed Timelock` },
    42857: { message: `HTLC Does Not Exist` },
    46887: { message: `Already Redeemed` },
    48401: { message: `Invalid signature` },
    49162: { message: `Already Refunded` },
    50918: { message: `Hashlock Not Match` },
    58417: { message: `Contract Does Not Exist` },
}

const LayerswapV8_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"HTLC","header":null,"fields":[{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"senderPubKey","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"redeemed","type":{"kind":"simple","type":"bool","optional":false}},{"name":"refunded","type":{"kind":"simple","type":"bool","optional":false}}]},
    {"name":"Commit","header":458640785,"fields":[{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"senderPubKey","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}}]},
    {"name":"AddLock","header":1558004185,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"AddLockSig","header":3252164863,"fields":[{"name":"data","type":{"kind":"simple","type":"slice","optional":false}},{"name":"signature","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"Lock","header":317164721,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}}]},
    {"name":"Redeem","header":1972220037,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"Refund","header":2910985977,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"TokenCommitted","header":1912207274,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"senderPubKey","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hopChains","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAssets","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}},{"name":"hopAddresses","type":{"kind":"dict","key":"int","value":"StringImpl","valueFormat":"ref"}}]},
    {"name":"TokenLocked","header":2511348125,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstChain","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"dstAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcReceiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"srcAsset","type":{"kind":"simple","type":"string","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"TokenRedeemed","header":1701105609,"fields":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"redeemAddress","type":{"kind":"simple","type":"address","optional":false}},{"name":"secret","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"StringImpl","header":null,"fields":[{"name":"data","type":{"kind":"simple","type":"string","optional":false}}]},
]

const LayerswapV8_getters: ABIGetter[] = [
    {"name":"getDetails","arguments":[{"name":"Id","type":{"kind":"simple","type":"int","optional":false,"format":257}}],"returnType":{"kind":"simple","type":"HTLC","optional":true}},
    {"name":"getContractsLength","arguments":[],"returnType":{"kind":"simple","type":"int","optional":false,"format":257}},
    {"name":"getContracts","arguments":[{"name":"senderAddr","type":{"kind":"simple","type":"address","optional":false}}],"returnType":{"kind":"dict","key":"int","value":"int"}},
]

export const LayerswapV8_getterMapping: { [key: string]: string } = {
    'getDetails': 'getGetDetails',
    'getContractsLength': 'getGetContractsLength',
    'getContracts': 'getGetContracts',
}

const LayerswapV8_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"Commit"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AddLock"}},
    {"receiver":"internal","message":{"kind":"typed","type":"AddLockSig"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Lock"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Redeem"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Refund"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export class LayerswapV8 implements Contract {
    
    static async init() {
        return await LayerswapV8_init();
    }
    
    static async fromInit() {
        const init = await LayerswapV8_init();
        const address = contractAddress(0, init);
        return new LayerswapV8(address, init);
    }
    
    static fromAddress(address: Address) {
        return new LayerswapV8(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  LayerswapV8_types,
        getters: LayerswapV8_getters,
        receivers: LayerswapV8_receivers,
        errors: LayerswapV8_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: Commit | AddLock | AddLockSig | Lock | Redeem | Refund | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Commit') {
            body = beginCell().store(storeCommit(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AddLock') {
            body = beginCell().store(storeAddLock(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'AddLockSig') {
            body = beginCell().store(storeAddLockSig(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Lock') {
            body = beginCell().store(storeLock(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Redeem') {
            body = beginCell().store(storeRedeem(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Refund') {
            body = beginCell().store(storeRefund(message)).endCell();
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