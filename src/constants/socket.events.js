const SOCKET_EVENTS = {
  // Server → Client events
  ROLE_UPDATED: 'role:updated',
  NEW_USER_REGISTERED: 'admin:new_user',
  JOB_STATUS_CHANGED: 'admin:job_status_changed',
  NOTIFICATION: 'notification',
};

module.exports = { SOCKET_EVENTS };