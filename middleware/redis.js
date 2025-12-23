const Redis = require('ioredis');

const redis = new Redis({
  host: "redis-16890.c100.us-east-1-4.ec2.cloud.redislabs.com",
  port: 16890,
  password: "8mV0DvUEmUHhcSRKF4IeIaFxmenVg9Ot",
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

redis.on("connect", () => {
  console.log("Redis Connected");
});

const getCachedData = (staticKey) => {
    return async (req, res, next) => {
        try {
            const key = staticKey || req.cacheKey;

            if (!key) {
                return next();
            }

            const cached = await redis.get(key);
            if (cached) {
                console.log(`Get ${key} from cache`);
                return res.json({
                    [key.split(':')[0]]: JSON.parse(cached),
                });
            }

            next();
        } catch (error) {
            console.error('Cache error:', error);
            next();
        }
    };
};

const rateLimiter = (limit = 10, window = 60) => {
    return async (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const key = `rate:${ip}`;
        
        const current = await redis.incr(key);
        
        if (current === 1) {
            await redis.expire(key, window);
        }
        
        if (current > limit) {
            return res.status(429).json({
                error: "Too many requests",
                retryAfter: `${window} seconds`
            });
        }
        
        next();
    };
};

const requestLogger = (req, res, next) => {
    const start = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    
    res.on('finish', async () => {
        const duration = Date.now() - start;
        const logKey = `logs:${new Date().toISOString().split('T')[0]}`;
        
        const logEntry = {
            method: req.method,
            path: req.path,
            status: res.statusCode,
            duration: duration,
            ip: ip,
            timestamp: new Date().toISOString(),
            userAgent: req.get('user-agent') || 'unknown'
        };
        
        await redis.lpush(logKey, JSON.stringify(logEntry));
        await redis.ltrim(logKey, 0, 999);
        await redis.expire(logKey, 86400 * 7);
    });
    
    next();
};

const apiKeyAuth = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
        return res.status(401).json({ error: "API key required" });
    }
    
    const isValid = async () => {
        const valid = await redis.sismember('valid_api_keys', apiKey);
        return valid === 1;
    };
    
    isValid().then(valid => {
        if (!valid) {
            return res.status(403).json({ error: "Invalid API key" });
        }
        next();
    });
};

const responseCache = (ttl = 60) => {
    return async (req, res, next) => {
        const cacheKey = `response:${req.method}:${req.originalUrl}`;
        const cached = await redis.get(cacheKey);
        
        if (cached) {
            console.log(`Cache hit for ${req.originalUrl}`);
            return res.send(JSON.parse(cached));
        }
        
        const originalSend = res.send;
        res.send = function(data) {
            if (res.statusCode === 200) {
                redis.setex(cacheKey, ttl, data);
            }
            originalSend.call(this, data);
        };
        
        next();
    };
};


module.exports = { redis, getCachedData, rateLimiter, requestLogger, apiKeyAuth, responseCache };
