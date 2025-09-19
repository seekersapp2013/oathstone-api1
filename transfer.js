import Oathstone from './oathstone.js';

const oathstone = new Oathstone();

// Transfer endpoint
export const transfer = async (req, res) => {
    try {
        const { privateKey, address, amount, type } = req.body;
        
        if (!privateKey || !address || !amount || !type) {
            return res.status(400).json({
                success: false,
                error: 'Required fields: privateKey, address, amount, type ("native" or "token")'
            });
        }

        const connected = await oathstone.connectNetworks();
        if (!connected) {
            return res.status(500).json({
                success: false,
                error: 'Failed to connect to blockchain networks'
            });
        }

        const contractsLoaded = await oathstone.loadContracts();
        const web3 = oathstone.getWeb3(Object.keys(oathstone.config.networks)[0]);
        const fromAccount = web3.eth.accounts.privateKeyToAccount(privateKey);
        const fromAddress = fromAccount.address;

        const results = {};

        for (const network of Object.keys(oathstone.config.networks)) {
            try {
                if (type === 'native') {
                    const receipt = await oathstone.transferNative(
                        network,
                        fromAddress,
                        privateKey,
                        address,
                        amount
                    );
                    
                    results[network] = {
                        success: true,
                        message: 'Native transfer successful',
                        txHash: receipt.transactionHash
                    };
                } else if (type === 'token') {
                    const tokens = Object.keys(oathstone.config.networks[network]?.tokens || {});
                    
                    for (const tokenName of tokens) {
                        try {
                            const receipt = await oathstone.transferToken(
                                network,
                                tokenName,
                                fromAddress,
                                privateKey,
                                address,
                                amount
                            );
                            
                            results[`${network}-${tokenName}`] = {
                                success: true,
                                message: `Token ${tokenName} transfer successful`,
                                txHash: receipt.transactionHash
                            };
                        } catch (tokenError) {
                            results[`${network}-${tokenName}`] = {
                                success: false,
                                error: `Failed to transfer token ${tokenName} on ${network}: ${tokenError.message}`
                            };
                        }
                    }
                } else {
                    results[network] = {
                        success: false,
                        error: 'Invalid transfer type. Must be "native" or "token"'
                    };
                }
            } catch (networkError) {
                results[network] = {
                    success: false,
                    error: `Transfer failed on ${network}: ${networkError.message}`
                };
            }
        }

        return res.status(200).json({
            success: true,
            results
        });
    } catch (error) {
        console.error('❌ /transfer error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
};