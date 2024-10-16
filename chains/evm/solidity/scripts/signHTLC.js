const ethers = require("ethers");
require("dotenv").config();

async function signHTLC() {
    const domain = {
        name: "LayerswapV8",
        version: "1",
        chainId: 13473,
        verifyingContract: "0xeAdCC212315Fd1Ef9f85F2778517bca30E91F6D6",
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
        addLockMsg: [
            { name: "Id", type: "bytes32" },
            { name: "hashlock", type: "bytes32" },
            { name: "timelock", type: "uint256" },
        ],
    };

    const message = {
        Id: "0x524a8f4ca981947dff186948faaaea46a5722292a31191c759082b46b6b746ad",
        hashlock: "0xa388e8a0625bf6f2630e44283a57a4d6d416c39a7b06fbd3a54a827d73bea05c",
        timelock: 1726156825,
    };

    const privateKey =  '01d3a69085f30b41b28ec56f8759784c7711d6311e53fb9e9d7e589d94196728';
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