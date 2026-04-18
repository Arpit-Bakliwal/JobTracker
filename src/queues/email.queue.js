const { Queue } = require('bullmq');

let emailQueue = null;

const getEmailQueue = () => {
  if (!emailQueue) {
    const { bullMQConnection } = require('../config/redis');
    emailQueue = new Queue('email', {
      connection: bullMQConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });
  }
  return emailQueue;
};

module.exports = getEmailQueue;