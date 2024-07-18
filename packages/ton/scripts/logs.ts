import { HttpClient, Api } from 'tonapi-sdk-js';
import {
    loadLockCommitment,
    loadLock,
    loadCommit,
    loadDeploy,
    loadRedeem,
    loadUnlock,
    loadUncommit,
} from "../wrappers/HashedTimeLockTON";
import { Cell, Slice } from '@ton/core';
import { Address } from 'ton';
import { hexToBase64 } from '../utils/utils';

type MsgTypeMap = {
    [key: string]: string;
};

const msgTypes: MsgTypeMap = {
    '2f3b56bd': 'Commit',
    'a958ac23': 'Uncommit',
    '2fe24f1c': 'LockCommitment',
    '12e78cb1': 'Lock',
    '758db085': 'Redeem',
    'ad821ef9': 'Unlock',
    '946a98b6': 'Deploy'
};

const functionMap: { [key: string]: (slice: Slice) => any } = {
    'Redeem': loadRedeem,
    'Lock': loadLock,
    'Unlock': loadUnlock,
    'Deploy': loadDeploy,
    'Uncommit': loadUncommit,
    'LockCommitment': loadLockCommitment,
    'Commit': loadCommit,
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

const address = 'EQCJhsfTsoxKKpMBDw8C5z_ZGbljdOLInZNvjFM8NtyyNLk2'; 
const token = 'AGVYQVBYQDB6KRAAAAAFWAOS73LJHXPEWONMCFRIRGOBL7WIDI5D5G2GRWOD347TUUFWPUA'; 

parseTx(address, token, 0).then(result => {
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