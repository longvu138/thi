const { expireBatch } = require('./attempts.service');
const logger = require('../../utils/logger');
const startExpiryJob = ({ env = process.env, expire = expireBatch, schedule = setInterval, unschedule = clearInterval, now = Date.now } = {}) => {
 if (env.NODE_ENV === 'test' || env.NODE_TEST_CONTEXT || env.ATTEMPT_EXPIRY_JOB_ENABLED === 'false') return { stop: async () => {} };
 let running = null; let stopped = false;
 const interval = Math.max(1000, Number(env.ATTEMPT_EXPIRY_INTERVAL_MS) || 30000);
 const tick = () => {
  if (running || stopped) return;
  running = Promise.resolve().then(async () => {
   const started = now();
   const budget = Math.max(100, Number(env.ATTEMPT_EXPIRY_MAX_RUN_MS) || 20000);
   let count;
   do {
    count = await expire({batchSize:100});
   } while (!stopped && count === 100 && now() - started < budget);
  }).catch(error => {
   logger.error({ event: 'attempt_expiry_failed', message: error.message, stack: error.stack });
  }).finally(() => { running = null; });
 };
 const timer = schedule(tick, interval); timer.unref();
 return { stop: async () => { stopped = true; unschedule(timer); if (running) await running; } };
};
module.exports = { startExpiryJob };
