

# Caching Examples: MySQL + Redis, MongoDB + Redis, and Redis Only

This project demonstrates how to use Redis as a cache for product data in Node.js applications. There are three separate scripts:

- `mySQLredistest.js` — for MySQL + Redis
- `redismongotest.js` — for MongoDB + Redis
- `redistest.js` — for Redis only (no external database, simulates data fetch)

---

## Purpose of Each Test

- **mySQLredistest.js**: Demonstrates using Redis as a cache for product data stored in a MySQL database. Shows how to reduce database load and improve performance by caching frequently accessed data.
- **redismongotest.js**: Demonstrates using Redis as a cache for product data stored in a MongoDB database. Similar caching logic as above, but with MongoDB as the backend.
- **redistest.js**: Demonstrates basic Redis caching in Node.js without any external database. Simulates a database fetch and shows the difference between cache miss and cache hit.

---
---



## 1. MySQL + Redis Caching

### Prerequisites
- **Node.js** (v16 or later recommended)
- **MySQL Server** (running, with a user and password as in the script)
- **Redis Server** (running)

### Setup Instructions
1. **Clone or copy the project files** to your working directory.
2. **Initialize npm and install dependencies:**
   ```powershell
   npm init -y
   npm install mysql2 redis
   ```
3. **Start MySQL and Redis servers** if they are not already running.
   - MySQL: Ensure you have a database named `ecommerce` and update the credentials in `mySQLredistest.js` if needed.
   - Redis: Start the Redis server (e.g., `redis-server` on Linux/macOS or via the installed app on Windows).
4. **Run the script:**
   ```powershell
   node mySQLredistest.js
   ```

### What the Script Does
- Connects to MySQL and Redis.
- Ensures a `products` table exists and inserts test data.
- Demonstrates caching: fetches product data, caches it in Redis, updates data, and invalidates the cache.

### Notes
- You do **not** need MongoDB for this script.
- If you change MySQL credentials or database name, update them in the script.
- The `node_modules` folder and `package-lock.json` are created automatically by npm.

### Troubleshooting
- Make sure both MySQL and Redis servers are running before executing the script.
- If you get connection errors, check your server status and credentials.

---

## 2. MongoDB + Redis Caching

### Prerequisites
- **Node.js** (v16 or later recommended)
- **MongoDB Server** (running)
- **Redis Server** (running)

### Setup Instructions
1. **Clone or copy the project files** to your working directory.
2. **Initialize npm and install dependencies:**
   ```powershell
   npm init -y
   npm install mongodb redis
   ```
3. **Start MongoDB and Redis servers** if they are not already running.
   - MongoDB: Start the MongoDB server (e.g., `mongod` on Linux/macOS or via the installed app on Windows).
   - Redis: Start the Redis server (e.g., `redis-server` on Linux/macOS or via the installed app on Windows).
4. **Run the script:**
   ```powershell
   node redismongotest.js
   ```

### What the Script Does
- Connects to MongoDB and Redis.
- Ensures a `products` collection exists and inserts test data.
- Demonstrates caching: fetches product data, caches it in Redis, updates data, and invalidates the cache.

### Notes
- You do **not** need MySQL for this script.
- If you change MongoDB connection details, update them in the script.
- The `node_modules` folder and `package-lock.json` are created automatically by npm.

### Troubleshooting
- Make sure both MongoDB and Redis servers are running before executing the script.
- If you get connection errors, check your server status and connection details.

---

## 3. Redis Only Caching (No Database)

### Purpose
Demonstrates basic Redis caching in Node.js by simulating a database fetch. Useful for understanding the core caching logic and the difference between cache miss and cache hit.

### Prerequisites
- **Node.js** (v16 or later recommended)
- **Redis Server** (running)

### Setup Instructions
1. **Clone or copy the project files** to your working directory.
2. **Initialize npm and install dependencies:**
   ```powershell
   npm init -y
   npm install redis
   ```
3. **Start the Redis server** if it is not already running (e.g., `redis-server`).
4. **Run the script:**
   ```powershell
   node redistest.js
   ```

### Expected Output
You should see output similar to:

```
Connected to Redis...
First request:
Cache miss
Fetching data from database...
Data cached: { id: 1001, name: 'Product1001', price: 100 }
Product: {"id":1001,"name":"Product1001","price":100}, Time: X seconds

Second request:
Cache hit: {"id":1001,"name":"Product1001","price":100}
Product: {"id":1001,"name":"Product1001","price":100}, Time: Y seconds
```
Where the first request is a cache miss (simulated database fetch), and the second request is a cache hit (faster, from Redis).
