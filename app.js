const express = require('express');
const { getProducts, getProductsDetail } = require('./api/products');
const { redis, getCachedData, rateLimiter, requestLogger, apiKeyAuth, responseCache } = require('./middleware/redis');
const crypto = require('crypto');

const app = express();

app.use(requestLogger);

app.get("/", rateLimiter(5, 60), (req, res) => {
  res.send("Server is running");
});

app.get("/clear", async (req, res) => {
  const keys = await redis.keys('*');
  if (keys.length > 0) {
    await redis.del(...keys);
  }
  res.send("All cache cleared");
});

app.get("/products", rateLimiter(10, 60), getCachedData("products"), async (req, res) => {
    const products = await getProducts();
    await redis.setex("products", 30, JSON.stringify(products));
    res.json({ products });
});

app.get("/product/:id", rateLimiter(20, 60), (req, res, next) => {
    req.cacheKey = `product:${req.params.id}`;
    next();
}, getCachedData(), async (req, res) => {
    const product = await getProductsDetail(req.params.id);
    await redis.setex(req.cacheKey, 30, JSON.stringify(product));
    res.json({ product });
});

app.get("/order/:productId", rateLimiter(5, 60), (req, res, next) => {
    req.cacheKey = `order:${req.params.productId}`;
    next();
}, getCachedData(), async (req, res) => {
    const order = {
        id: Date.now(),
        productId: req.params.productId,
        productName: `Product ${req.params.productId}`,
        quantity: 1,
        total: req.params.productId * 100,
        status: "ordered",
        timestamp: new Date().toISOString()
    };
    
    await redis.setex(req.cacheKey, 300, JSON.stringify(order));
    res.json({ order });
});

app.get("/stats", async (req, res) => {
    const keys = await redis.keys('*');
    const memory = await redis.info('memory');
    const stats = await redis.info('stats');
    
    res.json({
        totalKeys: keys.length,
        memoryInfo: memory,
        stats: stats,
        uptime: process.uptime()
    });
});

app.post("/api-key", async (req, res) => {
    const apiKey = crypto.randomBytes(32).toString('hex');
    await redis.sadd('valid_api_keys', apiKey);
    res.json({ apiKey });
});

app.get("/admin/logs", apiKeyAuth, async (req, res) => {
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const logs = await redis.lrange(`logs:${date}`, 0, 100);
    res.json(logs.map(log => JSON.parse(log)));
});

app.get("/health", async (req, res) => {
    const redisStatus = await redis.ping() === 'PONG' ? 'healthy' : 'unhealthy';
    res.json({
        status: 'ok',
        redis: redisStatus,
        timestamp: new Date().toISOString()
    });
});

app.listen(3000, () => {
  console.log("Server is running on port 3000");
});