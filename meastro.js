const axios = require('axios');

// Function to handle the /maestro/browse route for MultiOn tasks
const maestroBrowseRoute = async (req, res) => {
    try {
        const { url, cmd } = req.body;  // Get the URL and cmd from the request body

        // MultiOn API endpoint for browsing tasks
        const multionApiUrl = 'https://api.multion.ai/v1/web/browse';
        const apiKey = process.env.MULTION_API_KEY;

        // Prepare the payload with the required cmd
        const payload = {
            cmd: cmd,  // The cmd tells the API to perform the specific task
            url: url,
        };

        // Make the request to MultiOn API
        const response = await axios.post(multionApiUrl, payload, {
            headers: {
                'X_MULTION_API_KEY': apiKey,  // Use the correct header for API key
                'Content-Type': 'application/json',
            },
        });

        // Respond with the result
        res.json({
            message: 'Task executed successfully.',
            data: response.data,  // Send back the response data from MultiOn
        });
    } catch (error) {
        console.error("Error while calling MultiOn API:", error);
        res.status(500).json({ error: 'Failed to take screenshot via MultiOn API.' });
    }
};

module.exports = { maestroBrowseRoute };










