// CommonJS entry point for iisnode compatibility
const path = require('path');

// Set the port from environment or default
process.env.PORT = process.env.PORT || 3001;

// Import and start the ES module server
async function startServer() {
  try {
    console.log('🚀 Starting Ambrosia Service...');
    console.log('📁 Current directory:', __dirname);
    console.log('🌐 Port:', process.env.PORT);
    
    // Check if required files exist
    const fs = require('fs');
    const requiredFiles = [
      path.join(__dirname, 'data.json'),
      path.join(__dirname, 'oathstone.js'),
      path.join(__dirname, 'createWallet.js'),
      path.join(__dirname, 'transfer.js'),
      path.join(__dirname, 'getBalance.js'),
      path.join(__dirname, 'server.js')
    ];
    
    console.log('🔍 Checking for required files...');
    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        console.error(`❌ Missing required file: ${file}`);
        process.exit(1);
      } else {
        console.log(`✅ Found: ${path.basename(file)}`);
      }
    }
    
    // Import the ES module server
    await import('./server.js');
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

startServer();