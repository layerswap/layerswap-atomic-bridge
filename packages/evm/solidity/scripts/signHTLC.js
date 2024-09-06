const ethers = require("ethers");
require("dotenv").config();

async function signHTLC() {
    const domain = {
        name: "LayerswapV8",
        version: "1",
        chainId: 167009,
        verifyingContract: "0x4D4281aad72d1d6C6ba30b722b01F49E3474c80a",
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
            { name: "hashlock", type: "bytes32" },
            { name: "timelock", type: "uint256" },
        ],
    };

    const message = {
        hashlock: "0x2d6e23c82f3856baa3b42cc949d4dd8b8930be6d492ac0f20edadae53c6e66d7",
        timelock: 1725635268,
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