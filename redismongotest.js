const redis = require('redis');
const { MongoClient } = require('mongodb');

// Connect to Redis
const redisClient = redis.createClient({ url: 'redis://127.0.0.1:6379' });

redisClient.connect().catch((err) => {
    console.error('Redis connection failed:', err);
});

// Connect to MongoDB
const mongoClient = new MongoClient('mongodb://localhost:27017');

// declare variables for database and collection. we are using products collection hence the variable name
let db, productsCollection;

async function connectToMongo() {
    try {
        await mongoClient.connect();
        console.log('Connected to MongoDB');

        db = mongoClient.db('ecommerce');
        productsCollection = db.collection('products');

    } catch (error) {
        console.error('MongoDB connection failed:', error);
    }
}

// Function to get product details with Redis caching
async function getProductDetails(productId) {
    try {
        // Check Redis cache first
        const cacheKey = `product_${productId}`;

        const cachedProduct = await redisClient.get(cacheKey);
        if (cachedProduct) {
                    console.log('Cache hit!');
                    return JSON.parse(cachedProduct); // Return cached data
                } else {
                    console.log('Cache miss. Fetching from MongoDB...');
                    // Fetch from MongoDB
                    const product = await productsCollection.findOne({ product_id: productId });

                    if (product) {
                        // Store the result in Redis for future requests
                        await redisClient.set(cacheKey, JSON.stringify(product), {
                            EX: 3600 // Set an expiration time of 1 hour
                        });
                    }
                    return product;
                }
            } catch (error) {
                console.error('Error fetching product details:', error);
                return null;
            }
}

// Function to update product details and invalidate Redis cache
async function updateProductDetails(productId, update) {
    try {
        // Update MongoDB
        await productsCollection.updateOne({ product_id: productId }, { $set: update });

        // Invalidate Redis cache
        const cacheKey = `product_${productId}`;
        await redisClient.del(cacheKey);
        console.log('Product updated and Redis cache invalidated.');
    } catch (error) {
        console.error('Error updating product details:', error);
    }
}

// Insert products into MongoDB for testing
async function insertTestProducts() {
    const products = [
        { product_id: 101, name: 'Laptop', price: 1000, stock: 50 },
        { product_id: 102, name: 'Smartphone', price: 500, stock: 200 },
        { product_id: 103, name: 'Tablet', price: 300, stock: 100 },
        { product_id: 104, name: 'Monitor', price: 200, stock: 75 },
        { product_id: 105, name: 'Keyboard', price: 50, stock: 150 }
    ];

    await productsCollection.insertMany(products);
    console.log('Inserted test products into MongoDB');
}

// Main function to test the workflow
async function main() {
    await connectToMongo(); // Connect to MongoDB

    // Uncomment the next line to insert test products into MongoDB
    await insertTestProducts();

    // Get product details (Cache miss the first time)
    const product = await getProductDetails(101);
    console.log('Product Details:', product);

    // Get the product again (This should hit the cache)
    const cachedProduct = await getProductDetails(101);
    console.log('Cached Product Details:', cachedProduct);

    // Update the product details
    await updateProductDetails(101, { price: 1200 });

    // Get the updated product (Cache miss after invalidation)
    const updatedProduct = await getProductDetails(101);
    console.log('Updated Product Details:', updatedProduct);
}

// Run the main function
main();