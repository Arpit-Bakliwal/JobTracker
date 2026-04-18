const nodemailer = require('nodemailer');
const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM, NODE_ENV } = require('../config');

// Create a reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // true for 465, false for other ports
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
    },
});

// Verify connection on startup
const verifyEmailConnection = async () => {
    try {
        await transporter.verify();
        console.log('✅ Email transporter is configured correctly');
    } catch (error) {
        console.error('FATAL: ❌ Failed to verify email transporter:', error.message);
        // Don't exit the process for email issues, just log the error. The app can still function without email.
    }
};

// Send email function
const sendEmail = async ({to, subject, html}) => {
    if (NODE_ENV === 'development') {
        console.log('============ EMAIL PREVIEW ============');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log(`HTML: ${html}`);
        console.log('======================================');
        return;
    } 

    await transporter.sendMail({
        from: EMAIL_FROM,
        to,
        subject,
        html,
    });
};

// Email Templates
const sendWelcomeEmail = async (user) => {
    await sendEmail({
        to: user.email,
        subject: 'Welcome to Job Tracker!',
        html: `
            <h1>Welcome, ${user.name}!</h1>
            <p>Your account has been created successfully.</p>
            <p>Start tracking your job applications today.</p>
            <br/>
            <p>Good luck with your job search!</p>
            <p>Job Tracker Team</p>
           `,
    });
};

const sendJobStatusEmail = async (user, job) => {
    const statusMessages = {
        SCREENING: 'You have moved to screening stage',
        INTERVIEW: 'Congratulations! You have an interview',
        OFFER: 'Amazing! You received an offer',
        REJECTED: 'Unfortunately you were not selected',
        WITHDRAWN: 'You have withdrawn your application',
    };

    await sendEmail({
    to: user.email,
    subject: `Job Update: ${job.title} at ${job.company}`,
    html: `
      <h1>Job Application Update</h1>
      <p>Hi ${user.name},</p>
      <p>${statusMessages[job.status] || 'Your job status has been updated'}</p>
      <br/>
      <p><strong>Position:</strong> ${job.title}</p>
      <p><strong>Company:</strong> ${job.company}</p>
      <p><strong>Status:</strong> ${job.status}</p>
      <br/>
      <p>Good luck!</p>
      <p>Job Tracker Team</p>
    `,
  });
};

const sendAccountDeletionEmail = async (user) => {
  await sendEmail({
    to: user.email,
    subject: 'Your account has been deleted',
    html: `
      <h1>Account Deleted</h1>
      <p>Hi ${user.name},</p>
      <p>Your Job Tracker account has been deleted by an administrator.</p>
      <p>If you believe this was a mistake, please contact support.</p>
      <br/>
      <p>Job Tracker Team</p>
    `,
  });
};

const sendPendingApplicationsEmail = async (user, jobs) => {
  const jobList = jobs
    .map((job) => `<li>${job.title} at ${job.company}</li>`)
    .join('');

  await sendEmail({
    to: user.email,
    subject: 'You have pending job applications',
    html: `
      <h1>Pending Applications Reminder</h1>
      <p>Hi ${user.name},</p>
      <p>You have ${jobs.length} application(s) pending for more than 7 days:</p>
      <ul>${jobList}</ul>
      <p>Consider following up on these applications.</p>
      <br/>
      <p>Job Tracker Team</p>
    `,
  });
};

module.exports = {
  verifyEmailConnection,
  sendWelcomeEmail,
  sendJobStatusEmail,
  sendAccountDeletionEmail,
  sendPendingApplicationsEmail,
};