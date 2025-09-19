import Oathstone from './oathstone.js';

const oathstone = new Oathstone();

// Wallet creation endpoint
export const createWallet = async (req, res) => {
    try {
        console.log('🔄 /createWallet requested...');
        
        const connected = await oathstone.connectNetworks();
        if (!connected) {
            console.error('❌ Failed to connect to networks.');
            return res.status(500).json({
                success: false,
                error: 'Failed to connect to blockchain networks.',
            });
        }

        const wallet = oathstone.createWallet();
        if (!wallet) {
            console.error('❌ Failed to create wallet.');
            return res.status(500).json({
                success: false,
                error: 'Failed to generate wallet.',
            });
        }

        console.log('\n📦 Wallet Created:');
        console.log(`🔐 Address:     ${wallet.address}`);
        console.log(`🗝️  Private Key: ${wallet.privateKey}`);
        console.log(`🧠 Mnemonic:    ${wallet.mnemonic}\n`);

        return res.status(200).json({
            success: true,
            message: 'Wallet successfully created',
            wallet: {
                address: wallet.address,
                privateKey: wallet.privateKey,
                mnemonic: wallet.mnemonic,
            },
        });
    } catch (err) {
        console.error('❌ Unexpected server error:', err);
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};