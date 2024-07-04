"use strict";
const axios = require('axios');


const listAllMovements = async() => {
    const CRYPTIO_API_KEY = process.env.CRYPTIO_API_KEY;
    const tx_hash = '0xfdf027f88de3290e8493086abdf24b2b1316c3159be2b5ef06109784c81cbbc7'
    const options = {
        method: 'GET',
        url: `https://app-api.cryptio.co/api/movement?transaction_hashes=${tx_hash}`,
        headers: {
            accept: 'application/json',
            'cryptio-api-key': CRYPTIO_API_KEY
        }
    };

    try {
        const response = await axios(options);
        return response?.data?.data;
    } catch (error) {
        console.log('Error when getting transactions data', error);
    }
}

const transactionGroups = async() => {
    const movements = await listAllMovements();
    const transactions = {};

    for (const movement of movements) {
        const { transaction_id, asset, ...rest } = movement;
        if (!transactions[transaction_id]) {
            transactions[transaction_id] = {
                id: transaction_id,
                assets: {}
            };
        }

        if (!transactions[transaction_id].assets[asset]) {
            transactions[transaction_id].assets[asset] = [];
        }

        transactions[transaction_id].assets[asset].push(rest);
    }

    return Object.values(transactions);
}

const labelOperation = async(mv_id, label_id) => {
    const CRYPTIO_API_KEY = process.env.CRYPTIO_API_KEY;
    let options = {
        method: 'POST',
        url: `https://app-api.cryptio.co/api/label/${label_id}/apply`,
        headers: {
          'content-type': 'application/json',
          'cryptio-api-key': CRYPTIO_API_KEY
        },
        data: {
          movements: mv_id,
        }
    };

    try {
        let response = await axios(options);
        return {
            status: response.status,
            statusText: response.statusText
        } 
    } catch (error) {
        console.log('Error when applying labels', error);
    }
}


const applyLabels = async() => {
    const tx_groups = await transactionGroups();
    return tx_groups.map(async obj => {
        const { assets } = obj;
        const asset_keys = Object.keys(assets);
        for (const asset of asset_keys) {
            const movements = assets[asset];
            let net_volume = 0;
            const mv_ids = [];
            for (const movement of movements) {
                const { volume, direction, id } = movement;
                if (direction === 'in') {
                    net_volume += parseFloat(volume);
                } else {
                    net_volume -= parseFloat(volume);
                }
                mv_ids.push(id);
            }
            obj.assets[asset].push({net_volume});

            let label_res;
            if (net_volume > 0) {
                //apply revenue label
                const revenue_id = '18f3bc7a-2165-4cb3-8f4d-6c21fd9ea322';
                label_res = await labelOperation(mv_ids, revenue_id);
            } else {
                //apply ignore label
                const ignore_id = '845eb3d0-2f73-4848-93fe-2f90efbc4d43';
                label_res = await labelOperation(mv_ids, ignore_id);
            }
        }
        return obj;
    })
}

`
NOTES

I observed that the Notion page for the test listed a revenue id (1e7c5038-52f6-452b-9d40-cac8e572920a) 
that was not getting applied when I called my labelOperation function. So I checked the API documentation 
for endpoints to list all labels and found another revenue label (18f3bc7a-2165-4cb3-8f4d-6c21fd9ea322) 
which I used instead and that was applied successfully.
`

applyLabels().then();