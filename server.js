import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import wallet and transfer handlers
import { createWallet } from './createWallet.js';
import { transfer } from './transfer.js';
import { getBalance } from './getBalance.js';


const app = express();
const PORT = 3001;

// Middleware
app.use(cors()); // Enable CORS for all origins
app.use(express.json()); // Parse JSON request body

// Root endpoint
app.get('/', (req, res) => {
    res.send('<h1>Welcome to Ambrosia Service</h1><p>Use <code>/createWallet</code> to generate a wallet.</p>');
});

// Wallet and blockchain endpoints
app.get('/createWallet', createWallet);
app.post('/getBalance', getBalance);
app.post('/transfer', transfer);



// Start the server
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://codepen.oathstone.cloud:${PORT}`);
});




















