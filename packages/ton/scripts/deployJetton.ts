import * as fs from 'fs';
import * as path from 'path';
import { contractAddress } from 'ton';
import { LayerswapV8Jetton as JettonPreHTLC } from '../build/JettonPreHTLC/tact_LayerswapV8Jetton';
import { prepareTactDeployment } from '@tact-lang/deployer';

async function run() {
    let testnet = true; 
    let packageName = 'tact_LayerswapV8Jetton.pkg';
    let outputPath = path.resolve(__dirname, '../build/JettonPreHTLC'); 
    let init = await JettonPreHTLC.init();

    let address = contractAddress({
        workchain: 0, 
        initialCode: init.code as any,
        initialData: init.data as any
    }); 
    let data = init.data.toBoc(); 
    let pkg = fs.readFileSync(path.resolve(outputPath, packageName)); 

    let link = await prepareTactDeployment({ pkg, data, testnet });

    console.log('Address: ' + address.toString());
    console.log('Deploy link: ' + link);
}

run().catch(err => {
    console.error('Failed to deploy contract:', err);
});