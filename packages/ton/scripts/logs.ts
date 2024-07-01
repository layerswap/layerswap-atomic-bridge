import { HttpClient, Api } from 'tonapi-sdk-js';
import {
    loadConvertP,
    loadCreate,
    loadCreateP,
    loadDeploy,
    loadRedeem,
    loadRefund,
    loadRefundP,
} from "../wrappers/HashedTimeLockTON";
import { Cell, Slice } from '@ton/core';
import { Address } from 'ton';
import { hexToBase64 } from '../utils/utils';

type MsgTypeMap = {
    [key: string]: string;
};

const msgTypes: MsgTypeMap = {
    'befc17a4': 'CreateP',
    '0fce1278': 'RefundP',
    'b7ee06c4': 'ConvertP',
    '2408e7eb': 'Create',
    'cb8c0e08': 'Redeem',
    '27cc3317': 'Refund',
    '946a98b6': 'Deploy'
};

const functionMap: { [key: string]: (slice: Slice) => any } = {
    'Redeem': loadRedeem,
    'Create': loadCreate,
    'Refund': loadRefund,
    'Deploy': loadDeploy,
    'RefundP': loadRefundP,
    'ConvertP': loadConvertP,
    'CreateP': loadCreateP,
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

const address = 'EQCRT9EEWE_uqjgPmX-ln-4sZQjIMjIrYEs2qrRIlnrCJoGG'; 
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