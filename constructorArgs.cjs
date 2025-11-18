// constructorArgs.js

function validateConstructorArgs(constructorArgs) {
    // Check if constructorArgs is undefined or null
    if (constructorArgs === undefined || constructorArgs === null) {
        throw new Error("Constructor arguments cannot be undefined or null.");
    }
    
    // If it's not an array, wrap it in an array
    if (!Array.isArray(constructorArgs)) {
        constructorArgs = [constructorArgs];
    }

    // Validate each argument (modify as needed)
    constructorArgs.forEach((arg) => {
        if (typeof arg !== 'string' && typeof arg !== 'number') {
            throw new Error("All constructor arguments must be either strings or numbers.");
        }
    });

    return constructorArgs;
}

function getConstructorArgs(req) {
    const { constructorArgs } = req.body;
    return validateConstructorArgs(constructorArgs);
}

module.exports = {
    getConstructorArgs
};
















