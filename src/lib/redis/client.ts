// Upstash Redis 클라이언트 설정

import { Redis } from '@upstash/redis';
import { getAppConfig } from '@/config/environment';

// 환경 설정에서 Redis 정보 가져오기
let redis: Redis | null = null;

function createRedisClient(): Redis | null {
  try {
    const config = getAppConfig();
    if (config.redis) {
      return new Redis({
        url: config.redis.url,
        token: config.redis.token,
      });
    }
  } catch (error) {
    console.warn('Failed to get Redis configuration:', error);
  }
  return null;
}

// Redis 클라이언트 인스턴스 (lazy initialization)
function getRedis(): Redis | null {
  if (!redis) {
    redis = createRedisClient();
  }
  return redis;
}

// 개발 환경에서 Redis가 없는 경우를 위한 Mock 클라이언트
class MockRedis {
  private storage = new Map<string, any>();
  private lists = new Map<string, any[]>();

  async get(key: string) {
    return this.storage.get(key) || null;
  }

  async set(key: string, value: any, options?: { ex?: number; px?: number }) {
    this.storage.set(key, value);

    if (options?.ex) {
      setTimeout(() => this.storage.delete(key), options.ex * 1000);
    } else if (options?.px) {
      setTimeout(() => this.storage.delete(key), options.px);
    }

    return 'OK';
  }

  async del(key: string) {
    const existed = this.storage.has(key);
    this.storage.delete(key);
    this.lists.delete(key);
    return existed ? 1 : 0;
  }

  async lpush(key: string, ...values: any[]) {
    if (!this.lists.has(key)) {
      this.lists.set(key, []);
    }
    const list = this.lists.get(key)!;
    list.unshift(...values);
    return list.length;
  }

  async rpop(key: string, count?: number) {
    const list = this.lists.get(key);
    if (!list || list.length === 0) return null;

    if (count) {
      return list.splice(-count).reverse();
    } else {
      return list.pop() || null;
    }
  }

  async llen(key: string) {
    const list = this.lists.get(key);
    return list ? list.length : 0;
  }

  async lrange(key: string, start: number, stop: number) {
    const list = this.lists.get(key);
    if (!list) return [];

    if (stop === -1) stop = list.length - 1;
    return list.slice(start, stop + 1);
  }

  async exists(key: string) {
    return this.storage.has(key) || this.lists.has(key) ? 1 : 0;
  }
}

// Redis 연결 확인 및 Mock 클라이언트 사용 여부 결정
let redisClient: Redis | MockRedis | null = null;
let usingMockRedis = false;

async function initializeRedis() {
  const realRedis = getRedis();

  if (realRedis) {
    try {
      // Redis 연결 테스트
      await realRedis.ping();
      console.log('✅ Connected to Upstash Redis');
      redisClient = realRedis;
      usingMockRedis = false;
    } catch (error) {
      console.warn('⚠️  Cannot connect to Redis, using mock client for development');
      console.warn('Redis connection error:', error);
      redisClient = new MockRedis();
      usingMockRedis = true;
    }
  } else {
    console.warn('⚠️  Redis not configured, using mock client for development');
    console.warn('Please configure Redis settings in environment variables');
    redisClient = new MockRedis();
    usingMockRedis = true;
  }
}

// 초기화된 Redis 클라이언트 가져오기
async function getRedisClient(): Promise<Redis | MockRedis> {
  if (!redisClient) {
    await initializeRedis();
  }
  return redisClient!;
}

export { getRedisClient, usingMockRedis };

// 레거시 호환성을 위한 기본 export
const redisClientLegacy = {
  async get() { return (await getRedisClient()); }
};

export default redisClientLegacy;