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

// Import CommonJS blockchain modules with error handling
let deployCeloContract, deployEthContract, deployBNBContract, calculateCeloPrice, calculateEthPrice;

try {
    console.log('Loading CommonJS modules...');
    ({ deployCeloContract } = require('./celo3.cjs'));
    console.log('✅ Loaded celo3.cjs');
    ({ deployEthContract } = require('./eth2.cjs'));
    console.log('✅ Loaded eth2.cjs');
    ({ deployBNBContract } = require('./newbnb.cjs'));
    console.log('✅ Loaded newbnb.cjs');
    ({ calculateCeloPrice } = require('./celoPrice.cjs'));
    console.log('✅ Loaded celoPrice.cjs');
    ({ calculateEthPrice } = require('./ethPrice.cjs'));
    console.log('✅ Loaded ethPrice.cjs');
} catch (error) {
    console.error('❌ Error loading CommonJS modules:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
}

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

// Test endpoint for GET requests
app.get('/celo-test', (req, res) => {
    res.json({
        message: "Celo endpoint is working! Use POST /celo with proper JSON body for contract deployment.",
        expectedBody: {
            environment: "0 for testnet, 1 for mainnet",
            contractTitle: "MyToken",
            solidityFiles: "Array of solidity files with name and code",
            constructorArgs: "Array of constructor arguments",
            userPrivateKey: "Your private key"
        }
    });
});

// Price calculation endpoints
app.post('/celoPrice', calculateCeloPrice);
app.post('/ethPrice', calculateEthPrice);



// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
});

// 404 handler
app.use((req, res) => {
    console.log(`404 - Route not found: ${req.method} ${req.url}`);
    res.status(404).json({ 
        error: 'Route not found', 
        method: req.method, 
        url: req.url,
        availableRoutes: [
            'GET /',
            'GET /health',
            'GET /createWallet',
            'POST /getBalance',
            'POST /transfer',
            'POST /celo',
            'POST /eth',
            'POST /bnb',
            'POST /celoPrice',
            'POST /ethPrice'
        ]
    });
});

// Start the server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📡 Server ready to accept connections`);
});

// Handle server errors
server.on('error', (err) => {
    console.error('Server error:', err);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});




















