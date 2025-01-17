const ethers = require("ethers");
require("dotenv").config();

async function signHTLC() {
    const domain = {
      name: 'LayerswapV8',
      version: '1',
      chainId: 11155111,
      verifyingContract: '0xffBAFE27b69bcb16D638E3Bc79DcCCbb1eebf66c',
      salt: '0x2e4ff7169d640efc0d28f2e302a56f1cf54aff7e127eededda94b3df0946f5c0',
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
      Id: '0x3e2a9c9e3f2b6ca6e5ae9f033ba7974348027d985a6d44aed7b1aef2ccb078d9',
      hashlock: '0x3b7674662e6569056cef73dab8b7809085a32beda0e8eb9e9b580cfc2af22a55',
      timelock: 1736936159,
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