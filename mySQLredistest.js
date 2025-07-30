// Import necessary libraries
const mysql = require('mysql2/promise'); // Using mysql2/promise for async/await support
const redis = require('redis');

// --- Redis Client Setup ---
// Connect to Redis
const redisClient = redis.createClient({ url: 'redis://127.0.0.1:6379' });

// Handle Redis connection events
redisClient.on('connect', () => {
    console.log('Connected to Redis...');
});

redisClient.on('error', (err) => {
    console.error('Redis connection error:', err);
});

// --- MySQL Connection Pool Setup ---
// MySQL connection pool configuration
const mysqlPool = mysql.createPool({
    host: '127.0.0.1', // Your MySQL host (usually localhost)
    user: 'root',      // Your MySQL username
    password: '********', // Your MySQL password
    database: 'ecommerce', // The database to connect to
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// --- Database & Collection/Table Variables ---
// In MySQL, we work with tables directly, not collections.
// The 'products' table will be used.

// --- Function to Connect to MySQL (using pool for convenience) ---
// For a connection pool, you don't explicitly 'connect' and 'close'
// single connections. You acquire and release them from the pool.
// We'll just ensure the pool is ready.
async function testMysqlConnection() {
    try {
        // Get a connection from the pool to test it
        const connection = await mysqlPool.getConnection();
        console.log('Connected to MySQL pool successfully.');
        connection.release(); // Release the connection back to the pool
    } catch (error) {
        console.error('MySQL connection pool failed:', error);
        process.exit(1); // Exit if MySQL connection fails
    }
}

// --- Function to get product details with Redis caching ---
/**
 * Retrieves product details, prioritizing Redis cache.
 * If not found in cache, fetches from MySQL and caches it.
 * @param {number} productId - The ID of the product to retrieve.
 * @returns {object|null} The product object or null if not found/error.
 */
async function getProductDetails(productId) {
    try {
        const cacheKey = `product_${productId}`;

        // 1. Check Redis cache first
        const cachedProduct = await redisClient.get(cacheKey);
        if (cachedProduct) {
            console.log(`Cache hit for product_id: ${productId}!`);
            return JSON.parse(cachedProduct); // Return cached data
        } else {
            console.log(`Cache miss for product_id: ${productId}. Fetching from MySQL...`);

            // 2. Fetch from MySQL if not in cache
            const [rows] = await mysqlPool.execute(
                'SELECT product_id, name, price, stock FROM products WHERE product_id = ?',
                [productId]
            );

            const product = rows[0]; // Get the first (and only) row

            if (product) {
                // 3. Store the result in Redis for future requests
                await redisClient.set(cacheKey, JSON.stringify(product), {
                    EX: 3600 // Set an expiration time of 1 hour (3600 seconds)
                });
                console.log(`Data for product_id: ${productId} cached in Redis.`);
            } else {
                console.log(`Product with ID ${productId} not found in MySQL.`);
            }
            return product;
        }
    } catch (error) {
        console.error(`Error fetching product details for ID ${productId}:`, error);
        return null; // Return null on error
    }
}

// --- Function to update product details and invalidate Redis cache ---
/**
 * Updates product details in MySQL and invalidates the corresponding Redis cache entry.
 * @param {number} productId - The ID of the product to update.
 * @param {object} update - An object containing the fields to update (e.g., { price: 1200 }).
 */
async function updateProductDetails(productId, update) {
    try {
        // Construct the SET part of the SQL query dynamically
        const setClauses = Object.keys(update).map(key => `${key} = ?`).join(', ');
        const values = Object.values(update);

        // 1. Update MySQL
        const [result] = await mysqlPool.execute(
            `UPDATE products SET ${setClauses} WHERE product_id = ?`,
            [...values, productId] // Combine update values with the product ID
        );

        if (result.affectedRows > 0) {
            console.log(`Product ID ${productId} updated in MySQL.`);

            // 2. Invalidate Redis cache
            const cacheKey = `product_${productId}`;
            await redisClient.del(cacheKey);
            console.log(`Redis cache for product_id: ${productId} invalidated.`);
        } else {
            console.log(`Product ID ${productId} not found for update.`);
        }
    } catch (error) {
        console.error(`Error updating product details for ID ${productId}:`, error);
    }
}

// --- Function to insert products into MySQL for testing ---
/**
 * Inserts sample products into the MySQL 'products' table.
 * Creates the table if it doesn't exist.
 */
async function insertTestProducts() {
    try {
        // Create table if it doesn't exist
        await mysqlPool.execute(`
            CREATE TABLE IF NOT EXISTS products (
                product_id INT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                price DECIMAL(10, 2) NOT NULL,
                stock INT NOT NULL
            );
        `);
        console.log('Ensured "products" table exists in MySQL.');

        const products = [
            { product_id: 101, name: 'Laptop', price: 1000.00, stock: 50 },
            { product_id: 102, name: 'Smartphone', price: 500.00, stock: 200 },
            { product_id: 103, name: 'Tablet', price: 300.00, stock: 100 },
            { product_id: 104, name: 'Monitor', price: 200.00, stock: 75 },
            { product_id: 105, name: 'Keyboard', price: 50.00, stock: 150 }
        ];

        // Insert products, handling duplicates (e.g., ON DUPLICATE KEY UPDATE)
        // For simplicity, we'll just try to insert and ignore errors for existing keys
        // or clear the table first. Let's clear for consistent testing.
        await mysqlPool.execute('DELETE FROM products'); // Clear existing data for fresh test
        console.log('Cleared existing data from "products" table.');

        for (const product of products) {
            await mysqlPool.execute(
                'INSERT INTO products (product_id, name, price, stock) VALUES (?, ?, ?, ?)',
                [product.product_id, product.name, product.price, product.stock]
            );
        }
        console.log('Inserted test products into MySQL.');

    } catch (error) {
        console.error('Error inserting test products into MySQL:', error);
    }
}

// --- Main function to test the workflow ---
async function main() {
    // Connect Redis client (already initiated, but ensure it's ready)
    // The .connect() call for redisClient is already handled outside main,
    // but we can await it here to ensure it's connected before proceeding.
    try {
        await redisClient.connect();
    } catch (e) {
        // If connect() was already called and succeeded, this will throw
        // an error like 'ERR_CLIENT_ALREADY_CONNECTED'. We can ignore it
        // or handle it gracefully.
        if (e.message !== 'ERR_CLIENT_ALREADY_CONNECTED') {
            console.error('Error ensuring Redis connection:', e);
            process.exit(1);
        }
    }


    await testMysqlConnection(); // Test MySQL connection pool

    // Ensure test products are in MySQL
    await insertTestProducts();

    const productIdToTest = 101;

    // --- Test Scenario ---

    console.log('\n--- First Request (Expected: Cache Miss, Fetch from MySQL) ---');
    let startTime = Date.now();
    let productDetails = await getProductDetails(productIdToTest);
    console.log('Product Details (First Fetch):', productDetails);
    console.log(`Time taken: ${(Date.now() - startTime)} ms\n`);

    console.log('--- Second Request (Expected: Cache Hit, Fetch from Redis) ---');
    startTime = Date.now();
    productDetails = await getProductDetails(productIdToTest);
    console.log('Product Details (Second Fetch):', productDetails);
    console.log(`Time taken: ${(Date.now() - startTime)} ms\n`);

    console.log('--- Updating Product and Invaliding Cache ---');
    await updateProductDetails(productIdToTest, { price: 1250.00, stock: 55 });

    console.log('\n--- Third Request (Expected: Cache Miss due to Invalidation, Fetch from MySQL) ---');
    startTime = Date.now();
    productDetails = await getProductDetails(productIdToTest);
    console.log('Product Details (Third Fetch - Updated):', productDetails);
    console.log(`Time taken: ${(Date.now() - startTime)} ms\n`);

    // --- Cleanup ---
    await redisClient.quit(); // Close Redis connection
    await mysqlPool.end();    // Close MySQL connection pool
    console.log('\nConnections closed. Script finished.');
}

// Run the main function and catch any top-level errors
main().catch(error => {
    console.error('An unhandled error occurred:', error);
    // Ensure connections are closed even on unhandled errors
    redisClient.quit().catch(() => {});
    mysqlPool.end().catch(() => {});
    process.exit(1);
});
