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

export type HTLCNotification = {
    $$type: 'HTLCNotification';
    htlcID: bigint;
    sender: Address;
    receiver: Address;
    amount: bigint;
    timelock: bigint;
    hashlock: bigint;
    dstAddress: string;
    phtlcID: bigint;
}

export function storeHTLCNotification(src: HTLCNotification) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeInt(src.htlcID, 257);
        b_0.storeAddress(src.sender);
        b_0.storeAddress(src.receiver);
        let b_1 = new Builder();
        b_1.storeInt(src.amount, 257);
        b_1.storeInt(src.timelock, 257);
        b_1.storeInt(src.hashlock, 257);
        b_1.storeStringRefTail(src.dstAddress);
        let b_2 = new Builder();
        b_2.storeInt(src.phtlcID, 257);
        b_1.storeRef(b_2.endCell());
        b_0.storeRef(b_1.endCell());
    };
}

export function loadHTLCNotification(slice: Slice) {
    let sc_0 = slice;
    let _htlcID = sc_0.loadIntBig(257);
    let _sender = sc_0.loadAddress();
    let _receiver = sc_0.loadAddress();
    let sc_1 = sc_0.loadRef().beginParse();
    let _amount = sc_1.loadIntBig(257);
    let _timelock = sc_1.loadIntBig(257);
    let _hashlock = sc_1.loadIntBig(257);
    let _dstAddress = sc_1.loadStringRefTail();
    let sc_2 = sc_1.loadRef().beginParse();
    let _phtlcID = sc_2.loadIntBig(257);
    return { $$type: 'HTLCNotification' as const, htlcID: _htlcID, sender: _sender, receiver: _receiver, amount: _amount, timelock: _timelock, hashlock: _hashlock, dstAddress: _dstAddress, phtlcID: _phtlcID };
}

function loadTupleHTLCNotification(source: TupleReader) {
    let _htlcID = source.readBigNumber();
    let _sender = source.readAddress();
    let _receiver = source.readAddress();
    let _amount = source.readBigNumber();
    let _timelock = source.readBigNumber();
    let _hashlock = source.readBigNumber();
    let _dstAddress = source.readString();
    let _phtlcID = source.readBigNumber();
    return { $$type: 'HTLCNotification' as const, htlcID: _htlcID, sender: _sender, receiver: _receiver, amount: _amount, timelock: _timelock, hashlock: _hashlock, dstAddress: _dstAddress, phtlcID: _phtlcID };
}

function storeTupleHTLCNotification(source: HTLCNotification) {
    let builder = new TupleBuilder();
    builder.writeNumber(source.htlcID);
    builder.writeAddress(source.sender);
    builder.writeAddress(source.receiver);
    builder.writeNumber(source.amount);
    builder.writeNumber(source.timelock);
    builder.writeNumber(source.hashlock);
    builder.writeString(source.dstAddress);
    builder.writeNumber(source.phtlcID);
    return builder.build();
}

function dictValueParserHTLCNotification(): DictionaryValue<HTLCNotification> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeHTLCNotification(src)).endCell());
        },
        parse: (src) => {
            return loadHTLCNotification(src.loadRef().beginParse());
        }
    }
}

export type HTLCNotify = {
    $$type: 'HTLCNotify';
    data: HTLCNotification;
}

export function storeHTLCNotify(src: HTLCNotify) {
    return (builder: Builder) => {
        let b_0 = builder;
        b_0.storeUint(3261301892, 32);
        b_0.store(storeHTLCNotification(src.data));
    };
}

export function loadHTLCNotify(slice: Slice) {
    let sc_0 = slice;
    if (sc_0.loadUint(32) !== 3261301892) { throw Error('Invalid prefix'); }
    let _data = loadHTLCNotification(sc_0);
    return { $$type: 'HTLCNotify' as const, data: _data };
}

function loadTupleHTLCNotify(source: TupleReader) {
    const _data = loadTupleHTLCNotification(source.readTuple());
    return { $$type: 'HTLCNotify' as const, data: _data };
}

function storeTupleHTLCNotify(source: HTLCNotify) {
    let builder = new TupleBuilder();
    builder.writeTuple(storeTupleHTLCNotification(source.data));
    return builder.build();
}

function dictValueParserHTLCNotify(): DictionaryValue<HTLCNotify> {
    return {
        serialize: (src, builder) => {
            builder.storeRef(beginCell().store(storeHTLCNotify(src)).endCell());
        },
        parse: (src) => {
            return loadHTLCNotify(src.loadRef().beginParse());
        }
    }
}

 type Messenger_init_args = {
    $$type: 'Messenger_init_args';
}

function initMessenger_init_args(src: Messenger_init_args) {
    return (builder: Builder) => {
        let b_0 = builder;
    };
}

async function Messenger_init() {
    const __code = Cell.fromBase64('te6ccgECCwEAAjUAART/APSkE/S88sgLAQIBYgIDApLQAdDTAwFxsKMB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiFRQUwNvBPhhAvhi2zxZ2zzy4IIwyPhDAcx/AcoAye1UBAUAEaGFfdqJoaQAAwE07UTQ1AH4Y9IAMJFt4Pgo1wsKgwm68uCJ2zwGAsoBkjB/4HAh10nCH5UwINcLH94gghDCY4SEuo6VMNMfAYIQwmOEhLry4IHbPGwYXwh/4IIQlGqYtrqOp9MfAYIQlGqYtrry4IHTPwExyAGCEK/5D1dYyx/LP8n4QgFwbds8f+AwcAcIAAJtANSBAQHXAPpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IgB+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAHUAdCBAQHXAIEBAdcAgQEB1wDUAdAB1DDQgQEB1wAwEFgQVxBWATptbSJus5lbIG7y0IBvIgGRMuIQJHADBIBCUCPbPAkByshxAcoBUAcBygBwAcoCUAUg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIzxZQA/oCcAHKaCNus5F/kyRus+KXMzMBcAHKAOMNIW6znH8BygABIG7y0IABzJUxcAHKAOLJAfsACgCYfwHKAMhwAcoAcAHKACRus51/AcoABCBu8tCAUATMljQDcAHKAOIkbrOdfwHKAAQgbvLQgFAEzJY0A3ABygDicAHKAAJ/AcoAAslYzA==');
    const __system = Cell.fromBase64('te6cckECDQEAAj8AAQHAAQEFoM0DAgEU/wD0pBP0vPLICwMCAWIEDAKS0AHQ0wMBcbCjAfpAASDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IhUUFMDbwT4YQL4Yts8Wds88uCCMMj4QwHMfwHKAMntVAUHATTtRNDUAfhj0gAwkW3g+CjXCwqDCbry4InbPAYAAm0CygGSMH/gcCHXScIflTAg1wsf3iCCEMJjhIS6jpUw0x8BghDCY4SEuvLggds8bBhfCH/gghCUapi2uo6n0x8BghCUapi2uvLggdM/ATHIAYIQr/kPV1jLH8s/yfhCAXBt2zx/4DBwCAkA1IEBAdcA+kABINdJgQELuvLgiCDXCwoggQT/uvLQiYMJuvLgiAH6QAEg10mBAQu68uCIINcLCiCBBP+68tCJgwm68uCIAdQB0IEBAdcAgQEB1wCBAQHXANQB0AHUMNCBAQHXADAQWBBXEFYBOm1tIm6zmVsgbvLQgG8iAZEy4hAkcAMEgEJQI9s8CgHKyHEBygFQBwHKAHABygJQBSDXSYEBC7ry4Igg1wsKIIEE/7ry0ImDCbry4IjPFlAD+gJwAcpoI26zkX+TJG6z4pczMwFwAcoA4w0hbrOcfwHKAAEgbvLQgAHMlTFwAcoA4skB+wALAJh/AcoAyHABygBwAcoAJG6znX8BygAEIG7y0IBQBMyWNANwAcoA4iRus51/AcoABCBu8tCAUATMljQDcAHKAOJwAcoAAn8BygACyVjMABGhhX3aiaGkAAOIP93d');
    let builder = beginCell();
    builder.storeRef(__system);
    builder.storeUint(0, 1);
    initMessenger_init_args({ $$type: 'Messenger_init_args' })(builder);
    const __data = builder.endCell();
    return { code: __code, data: __data };
}

const Messenger_errors: { [key: number]: { message: string } } = {
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
}

const Messenger_types: ABIType[] = [
    {"name":"StateInit","header":null,"fields":[{"name":"code","type":{"kind":"simple","type":"cell","optional":false}},{"name":"data","type":{"kind":"simple","type":"cell","optional":false}}]},
    {"name":"Context","header":null,"fields":[{"name":"bounced","type":{"kind":"simple","type":"bool","optional":false}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"raw","type":{"kind":"simple","type":"slice","optional":false}}]},
    {"name":"SendParameters","header":null,"fields":[{"name":"bounce","type":{"kind":"simple","type":"bool","optional":false}},{"name":"to","type":{"kind":"simple","type":"address","optional":false}},{"name":"value","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"mode","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"body","type":{"kind":"simple","type":"cell","optional":true}},{"name":"code","type":{"kind":"simple","type":"cell","optional":true}},{"name":"data","type":{"kind":"simple","type":"cell","optional":true}}]},
    {"name":"Deploy","header":2490013878,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"DeployOk","header":2952335191,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}}]},
    {"name":"FactoryDeploy","header":1829761339,"fields":[{"name":"queryId","type":{"kind":"simple","type":"uint","optional":false,"format":64}},{"name":"cashback","type":{"kind":"simple","type":"address","optional":false}}]},
    {"name":"HTLCNotification","header":null,"fields":[{"name":"htlcID","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"sender","type":{"kind":"simple","type":"address","optional":false}},{"name":"receiver","type":{"kind":"simple","type":"address","optional":false}},{"name":"amount","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"timelock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"hashlock","type":{"kind":"simple","type":"int","optional":false,"format":257}},{"name":"dstAddress","type":{"kind":"simple","type":"string","optional":false}},{"name":"phtlcID","type":{"kind":"simple","type":"int","optional":false,"format":257}}]},
    {"name":"HTLCNotify","header":3261301892,"fields":[{"name":"data","type":{"kind":"simple","type":"HTLCNotification","optional":false}}]},
]

const Messenger_getters: ABIGetter[] = [
]

export const Messenger_getterMapping: { [key: string]: string } = {
}

const Messenger_receivers: ABIReceiver[] = [
    {"receiver":"internal","message":{"kind":"typed","type":"HTLCNotify"}},
    {"receiver":"internal","message":{"kind":"typed","type":"Deploy"}},
]

export class Messenger implements Contract {
    
    static async init() {
        return await Messenger_init();
    }
    
    static async fromInit() {
        const init = await Messenger_init();
        const address = contractAddress(0, init);
        return new Messenger(address, init);
    }
    
    static fromAddress(address: Address) {
        return new Messenger(address);
    }
    
    readonly address: Address; 
    readonly init?: { code: Cell, data: Cell };
    readonly abi: ContractABI = {
        types:  Messenger_types,
        getters: Messenger_getters,
        receivers: Messenger_receivers,
        errors: Messenger_errors,
    };
    
    private constructor(address: Address, init?: { code: Cell, data: Cell }) {
        this.address = address;
        this.init = init;
    }
    
    async send(provider: ContractProvider, via: Sender, args: { value: bigint, bounce?: boolean| null | undefined }, message: HTLCNotify | Deploy) {
        
        let body: Cell | null = null;
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'HTLCNotify') {
            body = beginCell().store(storeHTLCNotify(message)).endCell();
        }
        if (message && typeof message === 'object' && !(message instanceof Slice) && message.$$type === 'Deploy') {
            body = beginCell().store(storeDeploy(message)).endCell();
        }
        if (body === null) { throw new Error('Invalid message type'); }
        
        await provider.internal(via, { ...args, body: body });
        
    }
    
}