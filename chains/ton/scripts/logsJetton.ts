import { HttpClient, Api } from 'tonapi-sdk-js';
import { Cell, Slice } from '@ton/core';
import { Address } from 'ton';
import { hexToBase64 } from '../utils/utils';
import { loadTokenNotification,loadLockCommitment,loadDeploy,loadRedeem,loadUnlock,loadUncommit, loadCommitData, loadLockData} from '../wrappers/JettonPreHTLC';

type MsgTypeMap = {
    [key: string]: string;
};

const msgTypes: MsgTypeMap = {
    '7362d09c': 'TokenNotification',
    'a958ac23': 'Uncommit',
    '5cdd41d9': 'LockCommitment',
    '758db085': 'Redeem',
    'ad821ef9': 'Unlock',
    '946a98b6': 'Deploy'
};

const functionMap: { [key: string]: (slice: Slice) => any } = {
    'Uncommit': loadUncommit,
    'LockCommitment': loadLockCommitment,
    'Redeem': loadRedeem,
    'Unlock': loadUnlock,
    'Deploy': loadDeploy,
    'TokenNotification': loadTokenNotification,
};

async function parseTx(address: string, token: string, index: number): Promise<any> {
    const httpClient = new HttpClient({
        baseUrl: 'https://testnet.tonapi.io',
        baseApiParams: {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-type': 'application/json'
            }
        }
    });

    const client = new Api(httpClient);

    try {
        const tx = await client.blockchain.getBlockchainAccountTransactions(Address.parse(address).toString());
        const rawBody = tx.transactions[index].in_msg?.raw_body || "";  
        const result = findType(rawBody);
        if (result === 'TokenNotification') {
            let slc = Cell.fromBase64(hexToBase64(rawBody)).beginParse();
            let data = ((functionMap[result](slc)).forward_payload);
            let slice: Slice = data.asCell().beginParse(); 
            let flag = slice.loadUint(1);  
            let refCell: Cell = slice.loadRef();  
            let refSlice: Slice = refCell.beginParse();
            let op_code = refSlice.loadUint(32);  
            if ( 0x6769fafe == op_code) {
                return loadCommitData(refSlice);
            }
            if ( 0x5cdd41d9 == op_code) {
                return loadLockData(refSlice);
            }

        }
        if (result && functionMap[result]) {
            let slc = Cell.fromBase64(hexToBase64(rawBody)).beginParse(); 
            return functionMap[result](slc);
        } else {
            console.error('No result found or no matching function.');
        }
    } catch (error) {
        console.error("Error fetching data from TON API:", error);
    }
}

const address = 'kQAz381AguTykUXr6_IdjhuvnSrqPy2iWB91ODoJsGWd3Xqt'; 
const token = 'AGVYQVBYQDB6KRAAAAAFWAOS73LJHXPEWONMCFRIRGOBL7WIDI5D5G2GRWOD347TUUFWPUA'; 

parseTx(address, token, 1).then(result => {
    console.log(result);
  }).catch(error => {
    console.error('Error:', error);
  });


function findType(inputString: string): string | undefined {
    const normalizedInput = inputString.toLowerCase();
    for (const key in msgTypes) {
        const index = normalizedInput.indexOf(key);  
        if (index !== -1) {
            return msgTypes[key];
        }
    }
    return undefined; 
}
