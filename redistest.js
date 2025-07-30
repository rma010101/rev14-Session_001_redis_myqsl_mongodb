// Import the Redis library
const { createClient } = require('redis');

//create Redis client
// const client = createClient();
const client = createClient({ url: 'redis://127.0.0.1:6379' });

// Properly handle Redis connection
// callback
client.on('connect', () => {
    console.log('Connected to Redis...');
});

client.on('error', (err) => {
    console.error('Redis connection error:', err);
});
// console.log('hi')

// / / Wait for Redis to connect before running operations
async function main() {
    await client.connect(); // Connect the client before using it

    //Simulate database fetch
    function fetchDataFromDatabase(productId) {
        console.log('Fetching data from database...');
        return { id: productId, name: 'Product' + productId, price: 100 };
    }

     // Function to get product details with caching
     // set `productid:101` {id:101, name:'Product101', price100}
    async function getProductDetails(productId) {
        const cacheKey = `product:${productId}`;

        try {
            // Check Redis cache
            const cachedData = await client.get(cacheKey);

            if (cachedData) {
                console.log('Cache hit:', cachedData);
                return JSON.parse(cachedData);
            }

            console.log('Cache miss');
            const product = fetchDataFromDatabase(productId);
            await client.setEx(cacheKey, 3600, JSON.stringify(product));
            console.log('Data cached:', product);
            //return product;
        } catch (error) {
            console.error('Error getting product details:', error);
            throw error;
        }
         
    }
   // Call the function and ensure the Redis client is closed properly
        //   await getProductDetails(101);

         // First request (cache miss)
        const productId = 1001;
        console.log("First request:");
        let startTime = Date.now();
        let product = await getProductDetails(productId);
        console.log(`Product: ${JSON.stringify(product)}, Time: ${(Date.now() - startTime) / 1000} seconds\n`);

        // Second request (cache hit)
        console.log("Second request:");
        startTime = Date.now();
        product = await getProductDetails(productId);
        console.log(`Product: ${JSON.stringify(product)}, Time: ${(Date.now() - startTime) / 1000} seconds`);


        // Close the Redis client after the operations are done
        await client.quit();
}

//call the function main
main().catch(console.error)