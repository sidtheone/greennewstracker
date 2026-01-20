/**
 * Job Scheduler using node-cron
 * 
 * Provides cron-based scheduling for RSS fetch jobs
 */

import cron from 'node-cron';
import { createLogger } from './config/logger.js';
import { runJob } from './runner.js';

const logger = createLogger('scheduler');

// Scheduled tasks
const scheduledTasks = new Map<string, cron.ScheduledTask>();

// Job configuration
export interface JobConfig {
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
}

// Default job configurations
export const DEFAULT_JOBS: JobConfig[] = [
  {
    name: 'rss-fetch',
    schedule: '*/15 * * * *', // Every 15 minutes
    enabled: true,
  },
  {
    name: 'cleanup',
    schedule: '0 2 * * *', // Daily at 2 AM
    enabled: false, // Disabled by default
  },
];

/**
 * Start a scheduled job
 */
export function startJob(config: JobConfig): boolean {
  if (scheduledTasks.has(config.name)) {
    logger.warn({ name: config.name }, 'Job already scheduled');
    return false;
  }
  
  if (!config.enabled) {
    logger.info({ name: config.name }, 'Job disabled, skipping');
    return false;
  }
  
  // Validate cron expression
  if (!cron.validate(config.schedule)) {
    logger.error({ name: config.name, schedule: config.schedule }, 'Invalid cron expression');
    return false;
  }
  
  // Create scheduled task
  const task = cron.schedule(config.schedule, async () => {
    logger.info({ name: config.name }, 'Scheduled job triggered');
    
    try {
      await runJob(config.name);
    } catch (error) {
      logger.error({ 
        name: config.name, 
        error: error instanceof Error ? error.message : String(error) 
      }, 'Scheduled job failed');
    }
  }, {
    scheduled: false, // Don't start immediately
    timezone: 'UTC',
  });
  
  // Start the task
  task.start();
  scheduledTasks.set(config.name, task);
  
  logger.info({ 
    name: config.name, 
    schedule: config.schedule 
  }, 'Job scheduled successfully');
  
  return true;
}

/**
 * Stop a scheduled job
 */
export function stopJob(name: string): boolean {
  const task = scheduledTasks.get(name);
  if (!task) {
    logger.warn({ name }, 'Job not found');
    return false;
  }
  
  task.stop();
  scheduledTasks.delete(name);
  
  logger.info({ name }, 'Job stopped');
  
  return true;
}

/**
 * Start all default jobs
 */
export function startAllJobs(): void {
  logger.info({ count: DEFAULT_JOBS.length }, 'Starting all scheduled jobs');
  
  for (const config of DEFAULT_JOBS) {
    startJob(config);
  }
}

/**
 * Stop all scheduled jobs
 */
export function stopAllJobs(): void {
  logger.info({ count: scheduledTasks.size }, 'Stopping all scheduled jobs');
  
  for (const [name, task] of scheduledTasks) {
    task.stop();
    logger.info({ name }, 'Job stopped');
  }
  
  scheduledTasks.clear();
}

/**
 * Get status of all scheduled jobs
 */
export function getScheduledJobsStatus(): Array<{
  name: string;
  schedule: string;
  running: boolean;
}> {
  return DEFAULT_JOBS.map(config => ({
    name: config.name,
    schedule: config.schedule,
    running: scheduledTasks.has(config.name),
  }));
}

/**
 * Check if a job is currently scheduled
 */
export function isJobScheduled(name: string): boolean {
  return scheduledTasks.has(name);
}

/**
 * Manually trigger a job (useful for testing)
 */
export async function triggerJob(name: string): Promise<void> {
  logger.info({ name }, 'Manually triggering job');
  
  const jobConfig = DEFAULT_JOBS.find(j => j.name === name);
  if (!jobConfig) {
    throw new Error(`Job not found: ${name}`);
  }
  
  await runJob(name);
}

/**
 * Update job schedule
 */
export function updateJobSchedule(name: string, newSchedule: string): boolean {
  if (!cron.validate(newSchedule)) {
    logger.error({ name, schedule: newSchedule }, 'Invalid cron expression');
    return false;
  }
  
  // Stop existing job
  stopJob(name);
  
  // Find job config and update
  const jobConfig = DEFAULT_JOBS.find(j => j.name === name);
  if (!jobConfig) {
    logger.error({ name }, 'Job not found');
    return false;
  }
  
  jobConfig.schedule = newSchedule;
  
  // Restart job
  return startJob(jobConfig);
}

/**
 * Enable or disable a job
 */
export function setJobEnabled(name: string, enabled: boolean): boolean {
  const jobConfig = DEFAULT_JOBS.find(j => j.name === name);
  if (!jobConfig) {
    logger.error({ name }, 'Job not found');
    return false;
  }
  
  jobConfig.enabled = enabled;
  
  if (enabled) {
    return startJob(jobConfig);
  } else {
    return stopJob(name);
  }
}

/**
 * Get next run time for a job
 */
export function getNextRunTime(name: string): Date | null {
  const jobConfig = DEFAULT_JOBS.find(j => j.name === name);
  if (!jobConfig || !scheduledTasks.has(name)) {
    return null;
  }
  
  // Parse cron expression to get next run time
  // This is a simplified version - in production, use a proper cron parser
  const now = new Date();
  const [minute, _hour, _day, _month, _weekday] = jobConfig.schedule.split(' ');
  
  // Simple calculation for common patterns
  if (minute === '*/15') {
    const nextMinute = Math.ceil(now.getMinutes() / 15) * 15;
    const next = new Date(now);
    next.setMinutes(nextMinute, 0, 0);
    if (next <= now) {
      next.setMinutes(next.getMinutes() + 15);
    }
    return next;
  }
  
  return null;
}

/**
 * Initialize scheduler with environment configuration
 */
export function initializeScheduler(): void {
  logger.info({}, 'Initializing job scheduler');
  
  // Check environment for custom schedules
  const customSchedule = process.env.RSS_FETCH_SCHEDULE;
  if (customSchedule) {
    const jobConfig = DEFAULT_JOBS.find(j => j.name === 'rss-fetch');
    if (jobConfig && cron.validate(customSchedule)) {
      jobConfig.schedule = customSchedule;
      logger.info({ schedule: customSchedule }, 'Using custom RSS fetch schedule');
    } else {
      logger.warn({ schedule: customSchedule }, 'Invalid custom schedule, using default');
    }
  }
  
  // Start all enabled jobs
  startAllJobs();
  
  logger.info({}, 'Scheduler initialized');
}

/**
 * Cleanup scheduler (call on shutdown)
 */
export function cleanupScheduler(): void {
  logger.info({}, 'Cleaning up scheduler');
  stopAllJobs();
  logger.info({}, 'Scheduler cleaned up');
}
