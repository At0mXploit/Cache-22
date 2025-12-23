# Cache-22

A Node.js Express server with Redis caching, rate limiting, and monitoring features.
## Live Test

```bash
$ echo "First request (should be cache miss):"
curl -w "Response Time: %{time_total}s\n" -s https://cache-22.onrender.com/product/1

First request (should be cache miss):
{"product":{"id":"1","name":"Product 1","price":93}}Response Time: 4.942013s

$ echo -e "\nSecond request (should be cache hit):"
curl -w "Response Time: %{time_total}s\n" -s https://cache-22.onrender.com/product/1

Second request (should be cache hit):
{"product":{"id":"1","name":"Product 1","price":93}}Response Time: 0.665871s
```
From `4` sec to `0.6` sec LFG!
## Configuration
```bash
server/
├── app.js              # Main Express server
├── api/
│   └── products.js     # Product data functions
├── middleware/
│   └── redis.js        # Redis client and middleware
```
```bash
npm install
```
Update Redis connection in middleware/redis.js with your credentials.

```js
const redis = new Redis({
  host: "your-redis-host",
  port: your-port,
  password: "your-password"
});
```

```bash
npm start
```
## Middleware Features:
#### Caching (getCachedData)
- Automatic Redis caching
- 30-second TTL for products
- 5-minute TTL for orders
#### Rate Limiting (rateLimiter)
- IP-based rate limiting
- Configurable limits per endpoint
- Returns 429 when exceeded
#### Request Logging (requestLogger)
- Logs all requests to Redis
- Stores 7 days of logs
- Includes response time, IP, user agent
#### API Key Authentication (apiKeyAuth)
- Protects admin routes
- Requires `x-api-key` header
- Keys stored in Redis set
#### Response Caching (responseCache)
- Caches entire API responses
- Works with dynamic routes
- Skips non-200 responses

```bash
# Test basic endpoints
curl http://localhost:3000/
curl http://localhost:3000/health
curl http://localhost:3000/stats

# Test product endpoints (observe caching)
curl http://localhost:3000/products
curl http://localhost:3000/product/1
curl http://localhost:3000/order/45

# Clear cache
curl http://localhost:3000/clear

# Generate API key
curl -X POST http://localhost:3000/api-key

# View logs (replace YOUR_API_KEY)
curl -H "x-api-key: YOUR_API_KEY" http://localhost:3000/admin/logs
```
## So What the fuck is Redis ?
Redis (Remote Dictionary Server) is an open-source, in-memory key-value data store that can be used as a database, cache, and message broker. It's known for its blazing-fast performance (microsecond response times) because data is stored primarily in RAM.

Redis isn't just simple key-value strings:

- Strings - Basic key-value (SET name "Alice")

- Lists - Ordered collections (LPUSH queue task1)

- Sets - Unique, unordered collections (SADD tags red blue)

- Sorted Sets - Ordered by score (ZADD leaderboard 100 "player1")

- Hashes - Field-value maps (HSET user:1 name Alice age 30)

- Bitmaps - Bit-level operations

- HyperLogLog - Probabilistic cardinality estimation

- Streams - Log-like data structure (for messaging)

```bash
# Basic operations
SET user:1001 "{name: 'John', email: 'john@email.com'}"
GET user:1001
EXPIRE user:1001 3600  # Auto-delete after 1 hour

# Data structures
HSET product:500 name "Laptop" price 999  # Hash
LPUSH orders "order123"                   # List
SADD unique_visitors "192.168.1.1"        # Set
ZADD scores 1500 "playerA"                # Sorted Set
```

Redis operates as an in-memory data structure store, keeping its primary dataset entirely in RAM for sub-millisecond read/write access. It works by storing data as key-value pairs with versatile data types (strings, lists, hashes, sets, etc.), processed through a single-threaded event loop that handles all commands sequentially, avoiding locking overhead. While memory-based for speed, Redis can optionally persist data to disk through snapshots (RDB) or append-only logs (AOF) for durability. 

A stateless request contains all necessary information within itself. Each request independent. 

```bash
GET /api/user
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

A stateful request relies on server-stored context from previous interactions.

```bash
GET /cart
Cookie: session_id=abc123  # Server remembers this session's cart
```

```bash
┌──(at0m㉿DESKTOP-RA9DG2K)-[~]
└─$ sudo systemctl start redis-server

┌──(at0m㉿DESKTOP-RA9DG2K)-[~]
└─$ redis-cli -h 127.0.0.1 -p 6379
127.0.0.1:6379>
```

See Cheatsheet [here](https://quickref.me/redis.html).

```bash
# Set a key-value pair
SET name "John"
SET age 30
SET counter 100

# Get value
GET name          # Returns: "John"

# Check if key exists
EXISTS name       # Returns: 1 (exists)

# Delete key
DEL name

# Set with expiration (seconds)
SET session:abc123 "data" EX 3600  # Expires in 1 hour
# or
SETEX session:abc123 3600 "data"

# Check time to live
TTL session:abc123
```

```bash
# Lists (ordered)
LPUSH tasks "task1" "task2" "task3"
LRANGE tasks 0 -1  # Get all: "task3", "task2", "task1"
RPOP tasks         # Remove from end

# Sets (unique, unordered)
SADD tags "redis" "database" "cache"
SMEMBERS tags      # Get all tags
SISMEMBER tags "redis"  # Check if exists: 1

# Hashes (key-field-value)
HSET user:1000 name "Alice" age 25 email "alice@email.com"
HGET user:1000 name      # "Alice"
HGETALL user:1000        # All fields
```

```bash
# List all keys (use with caution in production)
KEYS *              # All keys
KEYS user:*         # Keys with pattern
KEYS session:*      # Session keys

# Get key type
TYPE user:1000      # Returns: hash

# Select database (0-15 by default)
SELECT 1           # Switch to database 1
SELECT 0           # Back to default

# Flush database
FLUSHDB            # Clear current database
FLUSHALL           # Clear ALL databases

# Get database size
DBSIZE             # Number of keys in current DB
```

```bash
# Get Redis info
INFO               # All information
INFO memory        # Memory info only
INFO stats         # Statistics
INFO clients       # Client connections

# Monitor all commands in real-time
MONITOR            # Ctrl+C to stop

# Get configuration
CONFIG GET *       # All config (huge output)
CONFIG GET port    # Specific config
CONFIG GET requirepass  # Check if password set
```


---

