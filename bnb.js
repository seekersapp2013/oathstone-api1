const { ethers } = require("ethers");
const solc = require("solc");
require('dotenv').config();

// Environment-specific configuration
const BNB_TESTNET_URL = process.env.BNB_TESTNET_URL;
const BNB_MAINNET_URL = process.env.BNB_MAINNET_URL;
const BNB_TESTNET_PRIVATE_KEY = process.env.BNB_TESTNET_PRIVATE_KEY;
const BNB_MAINNET_PRIVATE_KEY = process.env.BNB_MAINNET_PRIVATE_KEY;
const BSC_SCAN_BASE_URL = process.env.BSC_SCAN || 'https://testnet.bscscan.com/address/';

async function deployBNBContract(req, res) {
    try {
        const { environment, contractTitle, solidityFiles, constructorArgs, userPrivateKey } = req.body;

        // Validate Solidity files and user private key
        if (!solidityFiles || solidityFiles.length === 0) {
            return res.status(404).json({
                error: "1 or more important files seem to be missing from this request. Kindly check and revert."
            });
        }

        if (!userPrivateKey) {
            return res.status(400).json({ error: "User private key is required for signing the contract." });
        }

        // Format the user's private key correctly
        const formattedUserPrivateKey = userPrivateKey.startsWith('0x') ? userPrivateKey : '0x' + userPrivateKey;

        // Prepare input for Solidity compilation
        let input = {
            language: 'Solidity',
            sources: {},
            settings: {
                outputSelection: {
                    '*': {
                        '*': ['*'],
                    },
                },
            },
        };

        // Add Solidity files to input sources
        solidityFiles.forEach(file => {
            input.sources[`${file.name}.sol`] = { content: file.code };
        });

        // Ensure index.sol is present
        const indexFile = solidityFiles.find(file => file.name === 'index');
        if (!indexFile) {
            return res.status(404).json({
                error: "The main contract file 'index.sol' is missing from this request."
            });
        }

        // Compile Solidity code
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        if (!output.contracts || !output.contracts['index.sol']) {
            return res.status(400).json({
                error: "Unable to compile your code. Please check the Solidity code and try again."
            });
        }

        // Extract ABI and bytecode from compiled output
        const contractName = Object.keys(output.contracts['index.sol'])[0];
        const abi = output.contracts['index.sol'][contractName].abi;
        const bytecode = output.contracts['index.sol'][contractName].evm.bytecode.object;

        // Connect to the appropriate BNB network (testnet or mainnet)
        const provider = environment === 0
            ? new ethers.providers.JsonRpcProvider(BNB_TESTNET_URL)
            : new ethers.providers.JsonRpcProvider(BNB_MAINNET_URL);

        const wallet = new ethers.Wallet(formattedUserPrivateKey, provider);
        const balance = await wallet.getBalance();
        const balanceInEther = ethers.utils.formatEther(balance);

        console.log(`User Wallet: ${wallet.address}`);
        console.log(`User Balance: ${balanceInEther} BNB`);

        // Prepare contract factory and estimate gas fees
        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const tx = factory.getDeployTransaction(...constructorArgs);

        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        const estimatedGasFee = estimatedGas.mul(gasPrice);
        const estimatedGasFeeInEther = ethers.utils.formatEther(estimatedGasFee);
        const transactionFee = estimatedGasFee.mul(2).div(100);
        const transactionFeeInEther = ethers.utils.formatEther(transactionFee);

        console.log(`Estimated Gas Fee: ${estimatedGasFeeInEther} BNB`);
        console.log(`2% Transaction Fee: ${transactionFeeInEther} BNB`);

        // Fee wallet based on environment
        const feeWallet = environment === 0
            ? new ethers.Wallet(BNB_TESTNET_PRIVATE_KEY, provider)
            : new ethers.Wallet(BNB_MAINNET_PRIVATE_KEY, provider);

        // Ensure user has enough balance for the deployment
        const totalCost = estimatedGasFee.add(transactionFee);
        if (balance.lt(totalCost)) {
            const totalCostInEther = ethers.utils.formatEther(totalCost);
            return res.status(400).json({
                error: `Insufficient balance. You need at least ${totalCostInEther} BNB to cover the gas fee and transaction fee, but your balance is ${balanceInEther} BNB.`,
                userBalance: balanceInEther,
                gasFee: estimatedGasFeeInEther,
                transactionFee: transactionFeeInEther
            });
        }

        console.log("Deploying contract...");
        const contract = await factory.deploy(...constructorArgs);
        await contract.deployed();
        console.log(`Contract deployed at address: ${contract.address}`);

        // Transfer the transaction fee to the fee wallet
        const feeTx = await wallet.sendTransaction({
            to: feeWallet.address,
            value: transactionFee
        });
        await feeTx.wait();
        console.log(`Transaction fee transferred to fee wallet: ${feeWallet.address}`);

        // Construct BscScan URL for the deployed contract
        const bscscanUrl = `${BSC_SCAN_BASE_URL}${contract.address}`;

        // Respond with deployment details
        return res.status(200).json({
            message: "BNB contract deployed successfully!",
            userBalance: balanceInEther,
            gasFee: estimatedGasFeeInEther,
            transactionFee: transactionFeeInEther,
            contractAddress: contract.address,
            bscscanUrl: bscscanUrl,
            abi: abi
        });
    } catch (error) {
        console.error("Error deploying BNB contract:", error);
        return res.status(500).json({ error: "Failed to deploy BNB contract." });
    }
}

module.exports = { deployBNBContract };









