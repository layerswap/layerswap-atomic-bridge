const ethers = require("ethers");
require("dotenv").config();

async function signHTLC() {
    const domain = {
        name: "LayerswapV8",
        version: "1",
        chainId: 421614,
        verifyingContract: "0xE2F155B3e9d1c2d2106D23d60e55545fa3c0665f",
        salt: "0x2e4ff7169d640efc0d28f2e302a56f1cf54aff7e127eededda94b3df0946f5c0"
    };

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
            { name: "timelock", type: "uint48" },
        ],
    };

    const message = {
        Id: "0x6a3342a938166f66d2cb3a3c66c7d70199fc25b639257e516ee6e961c309126d",
        hashlock: "0x3b7674662e6569056cef73dab8b7809085a32beda0e8eb9e9b580cfc2af22a55",
        timelock: 99999999999,
    };

    const privateKey =  process.env.PRIV_KEY;
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