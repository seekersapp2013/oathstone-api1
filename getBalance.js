import Oathstone from './oathstone.js';

const oathstone = new Oathstone();

// Get balance endpoint
export const getBalance = async (req, res) => {
    try {
        const { privateKey } = req.body;
        
        if (!privateKey) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: privateKey',
            });
        }

        const connected = await oathstone.connectNetworks();
        if (!connected) {
            return res.status(500).json({
                success: false,
                error: 'Failed to connect to blockchain networks.',
            });
        }

        const contractsLoaded = await oathstone.loadContracts();
        if (!contractsLoaded) {
            return res.status(500).json({
                success: false,
                error: 'Failed to load token contracts.',
            });
        }

        const balances = {};

        for (const [network, config] of Object.entries(oathstone.config.networks)) {
            const web3 = oathstone.getWeb3(network);
            if (!web3) continue;

            const account = web3.eth.accounts.privateKeyToAccount(privateKey);
            const address = account.address;

            let nativeBalance = null;
            try {
                nativeBalance = await oathstone.getNativeBalance(network, address);
            } catch (err) {
                console.warn(`⚠️ Failed to fetch native balance for ${network}:`, err.message);
            }

            const tokenBalances = {};
            const tokens = config.tokens || {};
            
            for (const tokenName of Object.keys(tokens)) {
                try {
                    const tokenBalance = await oathstone.getTokenBalance(network, tokenName, address);
                    tokenBalances[tokenName] = tokenBalance;
                } catch (err) {
                    console.warn(`⚠️ Failed to fetch ${tokenName} balance on ${network}:`, err.message);
                    tokenBalances[tokenName] = null;
                }
            }

            balances[network] = {
                address,
                native: nativeBalance,
                tokens: tokenBalances
            };
        }

        return res.status(200).json({
            success: true,
            balances
        });
    } catch (error) {
        console.error('❌ Error in /getBalance:', error.message);
        console.error(error.stack);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};