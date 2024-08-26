const ethers = require("ethers");
require("dotenv").config();

async function signHTLC() {
    const domain = {
        name: "LayerswapV8",
        version: "1",
        chainId: 421614,
        verifyingContract: "0x3E3Abe0752A588e78b6F8926631bBb453d2bddCa",
        salt: "0x2e4ff7169d640efc0d28f2e302a56f1cf54aff7e127eededda94b3df0946f5c0"
    };

    // Use ethers.js to encode the domain and compute the domain separator
    const domainSeparator = ethers.keccak256(
        ethers.AbiCoder.defaultAbiCoder().encode(
            ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address', 'bytes32'],
            [
                ethers.keccak256(ethers.toUtf8Bytes('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract,bytes32 salt)')),
                ethers.keccak256(ethers.toUtf8Bytes(domain.name)),
                ethers.keccak256(ethers.toUtf8Bytes(domain.version)),
                domain.chainId,
                domain.verifyingContract,
                domain.salt
            ]
        )
    );

    console.log('Computed Domain Separator:', domainSeparator);

    const types = {
        lockCommitmentMsg: [
            { name: "hashlock", type: "bytes32" },
            { name: "timelock", type: "uint256" },
        ],
    };

    const message = {
        hashlock: "0x928a260e1022cffc1b90018ab7f80ed5b2aef0b25d8c7c6825348811c30c7b8a",
        timelock: 1724673591,
    };

    const privateKey =  '0xe9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9';
    const wallet = new ethers.Wallet(privateKey);

    const signature = await wallet.signTypedData(domain, types, message);

    console.log("Signature:", signature);

    const sig = ethers.Signature.from(signature);
    console.log({
        r: sig.r,
        s: sig.s,
        v: sig.v
    });
}

signHTLC().catch(console.error);