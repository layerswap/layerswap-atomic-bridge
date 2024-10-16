import { toNano, Cell } from '@ton/core';
import { SampleJetton } from '../wrappers/SampleJetton';
import { NetworkProvider } from '@ton/blueprint';
import { Address } from "@ton/ton";

export async function run(provider: NetworkProvider) {
    const owner = Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1"); 
    const content = new Cell(); 
    const maxSupply = 1000000n; 

    const sampleJetton = provider.open(await SampleJetton.fromInit(owner, content, maxSupply));

    await sampleJetton.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        {
            $$type: 'Mint',
            amount: 1000000n,
            receiver: Address.parse("0QCfCUwHtdIzOvupHmIQO-z40lrb2sUsYWRrPgPhCiiw64m1")
        }
    );

    await provider.waitForDeploy(sampleJetton.address);

}
