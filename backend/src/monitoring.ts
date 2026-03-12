type NotificationMetrics = {
  bookingEmailAttempts: number;
  bookingEmailSent: number;
  bookingEmailFailed: number;
  bookingEmailSkippedNoBooking: number;
  bookingEmailSkippedDisabled: number;
  bookingEmailSkippedDuplicate: number;
  reminderSweeps: number;
  reminderCandidates: number;
  reminderSent: number;
  reminderFailed: number;
  reminderSkippedNoBooking: number;
  reminderSkippedDisabled: number;
  reminderSkippedDuplicate: number;
};

type SchedulerState = {
  lastRunAt: string | null;
  lastRunDurationMs: number | null;
  lastRunSent: number;
  lastRunError: string | null;
};

const notificationMetrics: NotificationMetrics = {
  bookingEmailAttempts: 0,
  bookingEmailSent: 0,
  bookingEmailFailed: 0,
  bookingEmailSkippedNoBooking: 0,
  bookingEmailSkippedDisabled: 0,
  bookingEmailSkippedDuplicate: 0,
  reminderSweeps: 0,
  reminderCandidates: 0,
  reminderSent: 0,
  reminderFailed: 0,
  reminderSkippedNoBooking: 0,
  reminderSkippedDisabled: 0,
  reminderSkippedDuplicate: 0,
};

const schedulerState: SchedulerState = {
  lastRunAt: null,
  lastRunDurationMs: null,
  lastRunSent: 0,
  lastRunError: null,
};

export function incMetric(key: keyof NotificationMetrics, delta = 1): void {
  notificationMetrics[key] += delta;
}

export function recordSchedulerRun(params: {
  sent: number;
  durationMs: number;
  error?: string | null;
}): void {
  schedulerState.lastRunAt = new Date().toISOString();
  schedulerState.lastRunDurationMs = params.durationMs;
  schedulerState.lastRunSent = params.sent;
  schedulerState.lastRunError = params.error ?? null;
}

export function getMonitoringSnapshot() {
  return {
    uptimeSec: Math.floor(process.uptime()),
    notifications: { ...notificationMetrics },
    reminderScheduler: { ...schedulerState },
  };
}
