import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Import wallet and transfer handlers
import { createWallet } from './createWallet.js';
import { transfer } from './transfer.js';
import { getBalance } from './getBalance.js';

// Import CommonJS blockchain modules
const { deployCeloContract } = require('./celo3.js');
const { deployEthContract } = require('./eth2.js');
const { deployBNBContract } = require('./newbnb.js');
const { calculateCeloPrice } = require('./celoPrice.js');
const { calculateEthPrice } = require('./ethPrice.js');

// Check for required files at startup
const requiredFiles = [
    './data.json',
    './oathstone.js',
    './createWallet.js',
    './transfer.js',
    './getBalance.js'
];

console.log('🔍 Checking for required files...');
for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ Missing required file: ${file}`);
        process.exit(1);
    } else {
        console.log(`✅ Found: ${file}`);
    }
}


const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request body

// Root endpoint
app.get('/', (req, res) => {
    res.send('<h1>Welcome to Ambrosia Service</h1><p>Use <code>/createWallet</code> to generate a wallet.</p>');
});

// Health check endpoint
app.get('/health', (req, res) => {
    const healthCheck = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
        files: {}
    };
    
    // Check if required files exist
    const requiredFiles = ['./data.json', './oathstone.js', './createWallet.js', './transfer.js', './getBalance.js'];
    for (const file of requiredFiles) {
        healthCheck.files[file] = fs.existsSync(file);
    }
    
    res.status(200).json(healthCheck);
});

// Wallet and blockchain endpoints
app.get('/createWallet', createWallet);
app.post('/getBalance', getBalance);
app.post('/transfer', transfer);

// Blockchain deployment endpoints
app.post('/celo', deployCeloContract);
app.post('/eth', deployEthContract);
app.post('/bnb', deployBNBContract);

// Price calculation endpoints
app.post('/celoPrice', calculateCeloPrice);
app.post('/ethPrice', calculateEthPrice);



// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});




















