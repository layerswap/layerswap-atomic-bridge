import * as fs from 'fs';
import * as path from 'path';
import { contractAddress } from "ton";
import { LayerswapV8 } from "../build/HashedTimeLockTON/tact_LayerswapV8";
import { prepareTactDeployment } from "@tact-lang/deployer";

async function deployContract() {
    let testnet = true; 
    let packageName = 'tact_LayerswapV8.pkg';
    let outputPath = path.resolve(__dirname, '../build/HashedTimeLockTON'); 
    let init = await LayerswapV8.init();

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

deployContract().catch(err => {
    console.error('Failed to deploy contract:', err);
});

