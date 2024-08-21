// using ethereumjs-util 7.1.3
const ethUtil = require('ethereumjs-util');

// using ethereumjs-abi 0.6.9
const abi = require('ethereumjs-abi');

// using chai 4.3.4
const chai = require('chai');
const { recoverAddress } = require('ethers/transaction');

const typedData = {
    types: {
        EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
            { name: 'salt', type: 'bytes32' },

        ],
         HTLC: [
            { name: "dstAddress", type: "string" },
            { name: "dstChain", type: "string" },
            { name: "dstAsset", type: "string" },
            { name: "srcAsset", type: "string" },
            { name: "sender", type: "address" },
            { name: "srcReceiver", type: "address" },
            { name: "hashlock", type: "bytes32" },
            { name: "secret", type: "uint256" },
            { name: "amount", type: "uint256" },
            { name: "timelock", type: "uint256" },
            { name: "redeemed", type: "bool" },
            { name: "unlocked", type: "bool" },
        ],
    },
    primaryType: 'HTLC',
    domain: {
        name: 'HashedTimeLockEther',
        version: '1',
        chainId: 11155111,
        verifyingContract: '0x6595394Ae712ae759812E5D4569ba06eA74fDa16',
        salt: '0x2e4ff7169d640efc0d28f2e302a56f1cf54aff7e127eededda94b3df0946f5c0'
    },
    message: {
        dstAddress: "0QAS8JNB0G4zVkdxABCLVG-Vy3KXE3W3zz1yxpnfu4J-B40y",
        dstChain: "TON",
        dstAsset: "TON",
        srcAsset: "ETH",
        sender: "0xF6517026847B4c166AAA176fe0C5baD1A245778D",
        srcReceiver: "0x273F43cA9d3968B2FD138AF4dF90Fe7B6b6d59cD",
        hashlock: "0x7365646667000000000000000000000000000000000000000000000000000000",
        secret: 0,
        amount: 10000000000000,
        timelock: 1724577319,
        redeemed: false,
        unlocked: false,
    },
};

const types = typedData.types;

// Recursively finds all the dependencies of a type
function dependencies(primaryType, found = []) {
    if (found.includes(primaryType)) {
        return found;
    }
    if (types[primaryType] === undefined) {
        return found;
    }
    found.push(primaryType);
    for (let field of types[primaryType]) {
        for (let dep of dependencies(field.type, found)) {
            if (!found.includes(dep)) {
                found.push(dep);
            }
        }
    }
    return found;
}

function encodeType(primaryType) {
    // Get dependencies primary first, then alphabetical
    let deps = dependencies(primaryType);
    deps = deps.filter(t => t != primaryType);
    deps = [primaryType].concat(deps.sort());

    // Format as a string with fields
    let result = '';
    for (let type of deps) {
        result += `${type}(${types[type].map(({ name, type }) => `${type} ${name}`).join(',')})`;
    }
    return result;
}

function typeHash(primaryType) {
    return ethUtil.keccakFromString(encodeType(primaryType), 256);
}

function encodeData(primaryType, data) {
    let encTypes = [];
    let encValues = [];

    // Add typehash
    encTypes.push('bytes32');
    encValues.push(typeHash(primaryType));

    // Add field contents
    for (let field of types[primaryType]) {
        let value = data[field.name];
        if (field.type == 'string' || field.type == 'bytes') {
            encTypes.push('bytes32');
            value = ethUtil.keccakFromString(value, 256);
            encValues.push(value);
        } else if (types[field.type] !== undefined) {
            encTypes.push('bytes32');
            value = ethUtil.keccak256(encodeData(field.type, value));
            encValues.push(value);
        } else if (field.type.lastIndexOf(']') === field.type.length - 1) {
            throw 'TODO: Arrays currently unimplemented in encodeData';
        } else {
            encTypes.push(field.type);
            encValues.push(value);
        }
    }
    return abi.rawEncode(encTypes, encValues);
}

function structHash(primaryType, data) {
    return ethUtil.keccak256(encodeData(primaryType, data));
}

// function signHash() {
//     return ethUtil.keccak256(
//         Buffer.concat([
//             Buffer.from('1901', 'hex'),
//             structHash('EIP712Domain', typedData.domain),
//             structHash(typedData.primaryType, typedData.message),
//         ]),
//     );
// }

function signHash() {
    return ethUtil.keccak256(
        Buffer.concat([
            Buffer.from('1901', 'hex'),
            hashDomain(typedData.domain),
            hashMessage(typedData.message),
        ]),
    );
}

const privateKey = ethUtil.toBuffer('0xe9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9', 256);
const address = ethUtil.privateToAddress(privateKey);
const sig = ethUtil.ecsign(signHash(), privateKey);
console.log(address)
console.log(sig.v, "r:  ", "0x" + sig.r.toString('hex'),"s:  ", "0x" + sig.s.toString('hex') )

const recoveredPubKey = ethUtil.ecrecover(signHash(), sig.v, sig.r, sig.s);

const recoveredAddress = ethUtil.pubToAddress(recoveredPubKey);
console.log("Recovered Address:", ethUtil.bufferToHex(recoveredAddress));

function hashDomain(domain) {
    return ethUtil.keccak256(
        abi.rawEncode(
            ["bytes32", "bytes32", "bytes32", "uint256", "address", "bytes32"],
            [
                ethUtil.keccak256(Buffer.from("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)")),
                ethUtil.keccak256(Buffer.from(domain.name)),
                ethUtil.keccak256(Buffer.from(domain.version)),
                domain.chainId,
                domain.verifyingContract,
                domain.salt
            ]
        )
    );
}

function hashMessage(message) {
    return ethUtil.keccak256(
        abi.rawEncode(
            [
                "bytes32", "bytes32", "bytes32", "bytes32", 
                "bytes32", "address", "address", "bytes32", 
                "uint256", "uint256", "uint256", "bool", "bool"
            ],
            [
                ethUtil.keccak256(Buffer.from("HTLC(string dstAddress,string dstChain,string dstAsset,string srcAsset,address payable sender,address payable srcReceiver,bytes32 hashlock,uint256 secret,uint256 amount,uint256 timelock,bool redeemed,bool unlocked)")),
                ethUtil.keccak256(Buffer.from(message.dstAddress)),
                ethUtil.keccak256(Buffer.from(message.dstChain)),
                ethUtil.keccak256(Buffer.from(message.dstAsset)),
                ethUtil.keccak256(Buffer.from(message.srcAsset)),
                message.sender,
                message.srcReceiver,
                message.hashlock,
                message.secret,
                message.amount,
                message.timelock,
                message.redeemed,
                message.unlocked
            ]
        )
    );
}