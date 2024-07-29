import { Dictionary} from "@ton/core";
import {  StringImpl } from "../wrappers/HashedTimeLockTON";
import { Address } from "@ton/ton";

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function toNano(amount: string): bigint {
    return BigInt(Math.floor(parseFloat(amount) * (10 ** 9)));
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function createIntMap(initialData: [bigint, bigint][]): Dictionary<bigint, bigint> {
    const dict = Dictionary.empty<bigint, bigint>();

    initialData.forEach(([key, value]) => {
        dict.set(key, value);
    });

    return dict;
}

function createStrMap(initialData: [bigint, StringImpl][]): Dictionary<bigint, StringImpl> {
    const dict = Dictionary.empty<bigint, StringImpl>();

    initialData.forEach(([key, value]) => {
        dict.set(key, value);
    });

    return dict;
}

function createAddrMap(initialData: [bigint, Address][]): Dictionary<bigint, Address> {
    const dict = Dictionary.empty<bigint, Address>();

    initialData.forEach(([key, value]) => {
        dict.set(key, value);
    });

    return dict;
}

const hexToBase64 = (hex: string) =>
    btoa(
      String.fromCharCode(
        ...(hex.match(/[0-9a-f]{2}/gi) ?? []).map((c) => parseInt(c, 16))
      )
    );

      
export { delay,toNano,sleep,createIntMap,createStrMap,createAddrMap,hexToBase64 };

