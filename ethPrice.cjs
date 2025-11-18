const { ethers } = require("ethers");
const solc = require("solc");

const INFURA_TESTNET_URL = process.env.ETH_TESTNET_URL; // Infura testnet URL
const INFURA_MAINNET_URL = process.env.ETH_MAINNET_URL; // Infura mainnet URL

async function calculateEthPrice(req, res) {
    try {
        const { environment, solidityFiles, constructorArgs, userPrivateKey } = req.body;

        if (!solidityFiles || solidityFiles.length === 0) {
            return res.status(404).json({
                error: "1 or more important files seem to be missing from this request. Kindly check and revert."
            });
        }

        if (!userPrivateKey) {
            return res.status(400).json({ error: "User private key is required for signing." });
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

        // Process the Solidity files
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
                error: "Unable to compile your code. Please check the Solidity code and try again."
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

        console.log(`User Balance: ${balanceInEther} ETH`);
        console.log(`Estimated Gas Fee: ${estimatedGasFeeInEther} ETH`);
        console.log(`2% Transaction Fee: ${transactionFeeInEther} ETH`);

        const totalCost = estimatedGasFee.add(transactionFee);
        const totalCostInEther = ethers.utils.formatEther(totalCost);

        if (balance.lt(totalCost)) {
            return res.status(400).json({
                error: `Insufficient balance. You need at least ${totalCostInEther} ETH to cover the gas fee and transaction fee, but your balance is ${balanceInEther} ETH.`,
                userBalance: balanceInEther,
                gasFee: estimatedGasFeeInEther,
                transactionFee: transactionFeeInEther
            });
        }

        // Respond with calculated fees
        res.status(200).json({
            userBalance: balanceInEther,
            gasFee: estimatedGasFeeInEther,
            transactionFee: transactionFeeInEther,
            totalCost: totalCostInEther // Added totalCost field
        });
    } catch (error) {
        console.error("Error calculating gas fee:", error);
        res.status(500).json({ error: "Failed to calculate gas fee." });
    }
}

module.exports = {
    calculateEthPrice
};








