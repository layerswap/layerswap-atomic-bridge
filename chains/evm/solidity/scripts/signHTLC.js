const ethers = require("ethers");
require("dotenv").config();

async function signHTLC() {
    const domain = {
        name: "LayerswapV8",
        version: "1",
        chainId: 11155111,
        verifyingContract: "0x4a403b55fe7348df85182abbd00402d7442e0af2",
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
        Id: "0x0072c2bb6f8417f7d8b7cfbeb95db2feb17d2d22f0c2801fec1684025d1059af",
        hashlock: "0xddfafe7925d46e633decb4cb3c933b4c2f7d56679487f4b88ea3e6422eb2b81c",
        timelock: 1729861884,
    };

    const privateKey =  'e9ac8d073f52df4c776f16915460806dc5c28c9bc9b510ad074c275c8cff89e9';
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