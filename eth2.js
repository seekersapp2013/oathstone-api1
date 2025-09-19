const { ethers } = require("ethers");
const solc = require("solc");
const { getConstructorArgs } = require("./constructorArgs"); // Import the constructorArgs module

const INFURA_TESTNET_URL = process.env.ETH_TESTNET_URL; // Infura testnet URL
const INFURA_MAINNET_URL = process.env.ETH_MAINNET_URL; // Infura mainnet URL
const ETH_TESTNET_PRIVATE_KEY = process.env.ETH_TESTNET_PRIVATE_KEY;
const ETH_MAINNET_PRIVATE_KEY = process.env.ETH_MAINNET_PRIVATE_KEY;

const ETHERSCAN_BASE_URL = process.env.ETHER_SCAN || 'https://etherscan.io/address/';

async function deployEthContract(req, res) {
    try {
        const { environment, contractTitle, solidityFiles, userPrivateKey } = req.body;

        // Use the new function to get and validate constructor arguments
        const constructorArgs = getConstructorArgs(req);

        if (!solidityFiles || solidityFiles.length === 0) {
            return res.status(404).json({
                error: "1 or more important files seem to be missing from this request. Kindly check and revert."
            });
        }

        if (!userPrivateKey) {
            return res.status(400).json({ error: "User private key is required for signing the contract." });
        }

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

        // Process the solidity files
        solidityFiles.forEach(file => {
            input.sources[`${file.name}.sol`] = { content: file.code };
        });

        const indexFile = solidityFiles.find(file => file.name === 'index');
        if (!indexFile) {
            return res.status(404).json({
                error: "1 or more important files seem to be missing from this request. Kindly check and revert."
            });
        }

        // Compile the Solidity code
        const output = JSON.parse(solc.compile(JSON.stringify(input)));
        if (!output.contracts || !output.contracts['index.sol']) {
            return res.status(400).json({
                error: "Unable to compile and deploy your code. Please check the Solidity code and try again."
            });
        }

        const contractName = Object.keys(output.contracts['index.sol'])[0];
        const abi = output.contracts['index.sol'][contractName].abi;
        const bytecode = output.contracts['index.sol'][contractName].evm.bytecode.object;

        // Connect to Ethereum network using Infura
        const provider = environment === 0 ?
            new ethers.providers.JsonRpcProvider(INFURA_TESTNET_URL) :
            new ethers.providers.JsonRpcProvider(INFURA_MAINNET_URL);

        const wallet = new ethers.Wallet(userPrivateKey, provider);
        const balance = await wallet.getBalance();
        const balanceInEther = ethers.utils.formatEther(balance);

        const factory = new ethers.ContractFactory(abi, bytecode, wallet);
        const tx = factory.getDeployTransaction(...constructorArgs);
        const estimatedGas = await provider.estimateGas(tx);
        const gasPrice = await provider.getGasPrice();
        const estimatedGasFee = estimatedGas.mul(gasPrice);
        const estimatedGasFeeInEther = ethers.utils.formatEther(estimatedGasFee);
        const transactionFee = estimatedGasFee.mul(2).div(100);
        const transactionFeeInEther = ethers.utils.formatEther(transactionFee);

        const feeWallet = environment === 0 ?
            new ethers.Wallet(ETH_TESTNET_PRIVATE_KEY, provider) :
            new ethers.Wallet(ETH_MAINNET_PRIVATE_KEY, provider);

        console.log(`User Balance: ${balanceInEther} ETH`);
        console.log(`Estimated Gas Fee: ${estimatedGasFeeInEther} ETH`);
        console.log(`2% Transaction Fee: ${transactionFeeInEther} ETH`);

        const totalCost = estimatedGasFee.add(transactionFee);
        if (balance.lt(totalCost)) {
            const totalCostInEther = ethers.utils.formatEther(totalCost);
            return res.status(400).json({
                error: `Insufficient balance. You need at least ${totalCostInEther} ETH to cover the gas fee and transaction fee, but your balance is ${balanceInEther} ETH.`,
                userBalance: balanceInEther,
                gasFee: estimatedGasFeeInEther,
                transactionFee: transactionFeeInEther
            });
        }

        // Deploy contract
        const contract = await factory.deploy(...constructorArgs);
        await contract.deployed();

        // Transfer transaction fee
        const feeTx = await wallet.sendTransaction({
            to: feeWallet.address,
            value: transactionFee
        });
        await feeTx.wait();

        // Construct Etherscan URL
        const etherscanUrl = `${ETHERSCAN_BASE_URL}${contract.address}`;

        res.status(200).json({
            message: "Ethereum contract deployed successfully!",
            userBalance: balanceInEther,
            gasFee: estimatedGasFeeInEther,
            transactionFee: transactionFeeInEther,
            contractAddress: contract.address,
            etherscanUrl: etherscanUrl,
            abi: abi
        });
    } catch (error) {
        // Log the detailed error on the server for debugging purposes
        console.error("Error deploying Ethereum contract:", error);

        // Create a user-friendly error response
        const userErrorResponse = {
            error: "Failed to deploy Ethereum contract.",
            message: error.message,  // Include the specific error message
        };

        // Send the response to the client
        res.status(500).json(userErrorResponse);
    }
}

module.exports = {
    deployEthContract
};













