const { Worker } = require('bullmq');
const {
  sendWelcomeEmail,
  sendJobStatusEmail,
  sendAccountDeletionEmail,
  sendPendingApplicationsEmail,
} = require('../services/email.service');

const EMAIL_JOBS = {
  WELCOME: 'welcome',
  JOB_STATUS: 'job_status',
  ACCOUNT_DELETION: 'account_deletion',
  PENDING_APPLICATIONS: 'pending_applications',
};

let emailWorker = null;

const initEmailWorker = () => {
  // Import here — after Redis config is ready
  const { bullMQConnection } = require('../config/redis');

  emailWorker = new Worker(
    'email',
    async (job) => {
      console.log(`Processing email job: ${job.name}`);
      console.log("Job", JSON.stringify(job));
      switch (job.name) {
        case EMAIL_JOBS.WELCOME:
          await sendWelcomeEmail(job.data.user);
          break;
        case EMAIL_JOBS.JOB_STATUS:
          await sendJobStatusEmail(job.data.user, job.data.job);
          break;
        case EMAIL_JOBS.ACCOUNT_DELETION:
          await sendAccountDeletionEmail(job.data.user);
          break;
        case EMAIL_JOBS.PENDING_APPLICATIONS:
          await sendPendingApplicationsEmail(job.data.user, job.data.jobs);
          break;
        default:
          throw new Error(`Unknown email job type: ${job.name}`);
      }
    },
    {
      connection: bullMQConnection,
      concurrency: 5,
    }
  );

  emailWorker.on('completed', (job) => {
    console.log(`Email job completed: ${job.name} (ID: ${job.id})`);
  });

  emailWorker.on('failed', (job, error) => {
    console.error(`Email job failed: ${job.name} (ID: ${job.id}) - ${error.message}`);
  });

  emailWorker.on('error', (error) => {
    console.error('Email worker error:', error.message);
  });

  console.log('Email worker started successfully');
  return emailWorker;
};

const getEmailWorker = () => emailWorker;

module.exports = { initEmailWorker, getEmailWorker, EMAIL_JOBS };