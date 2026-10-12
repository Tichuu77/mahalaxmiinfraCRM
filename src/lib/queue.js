import Notification from '../models/Notification.js';

const ENABLE_REDIS = process.env.ENABLE_REDIS === 'true';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

let redisClient = null;
let incentiveQueue = null;
let notificationQueue = null;
let isRedisAvailable = false;
let redisInitialized = false;

async function getQueues() {
  if (redisInitialized) {
    return { isRedisAvailable, incentiveQueue, notificationQueue };
  }
  redisInitialized = true;

  if (ENABLE_REDIS) {
    try {
      const [{ default: IORedis }, { Queue }] = await Promise.all([
        import('ioredis'),
        import('bullmq'),
      ]);

      redisClient = new IORedis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 500,
        enableReadyCheck: false,
        retryStrategy: () => null,
      });

      redisClient.on('connect', () => {
        isRedisAvailable = true;
      });

      redisClient.on('error', () => {
        isRedisAvailable = false;
      });

      incentiveQueue = new Queue('incentive-queue', { connection: redisClient });
      notificationQueue = new Queue('notification-queue', { connection: redisClient });
    } catch (e) {
      isRedisAvailable = false;
    }
  }
  return { isRedisAvailable, incentiveQueue, notificationQueue };
}

/**
 * Dispatches an incentive calculation job.
 * If Redis/BullMQ is healthy, queues job; otherwise executes directly.
 */
export async function dispatchIncentiveCalculation(bookingId) {
  const queues = await getQueues();
  if (queues.isRedisAvailable && queues.incentiveQueue) {
    try {
      await queues.incentiveQueue.add('calculate', { bookingId }, { removeOnComplete: true });
      return { queued: true };
    } catch (e) {
      console.warn('[Queue] BullMQ enqueue failed, executing inline:', e.message);
    }
  }

  // Resilient inline fallback
  const { calculateAndCreateIncentives } = await import('./incentiveEngine.js');
  await calculateAndCreateIncentives(bookingId);
  return { queued: false, processedInline: true };
}

/**
 * Dispatches notification job.
 */
export async function dispatchNotification({ recipientId, title, message, type = 'system', link = '' }) {
  const queues = await getQueues();
  if (queues.isRedisAvailable && queues.notificationQueue) {
    try {
      await queues.notificationQueue.add('notify', { recipientId, title, message, type, link }, { removeOnComplete: true });
      return { queued: true };
    } catch (e) {
      console.warn('[Queue] BullMQ notify failed, executing inline:', e.message);
    }
  }

  await Notification.create({ recipientId, title, message, type, link });
  return { queued: false, processedInline: true };
}

export { incentiveQueue, notificationQueue };

