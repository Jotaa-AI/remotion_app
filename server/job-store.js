import fs from 'fs';
import path from 'path';
import {v4 as uuid} from 'uuid';
import {config} from './config.js';

const jobs = new Map();

const persistJob = (job) => {
  const filepath = path.join(config.jobsDir, `${job.id}.json`);
  fs.writeFileSync(filepath, JSON.stringify(job, null, 2));
};

export const createJob = ({file, sourceUrl, sourceType, brief}) => {
  const id = uuid();
  const now = new Date().toISOString();

  if (!file && !sourceUrl) {
    throw new Error('createJob requiere archivo local o sourceUrl.');
  }

  const input = file
    ? {
        sourceType: 'upload',
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: file.path,
      }
    : {
        sourceType: sourceType || 'youtube',
        sourceUrl,
        filename: null,
        originalname: null,
        mimetype: null,
        size: null,
        path: null,
      };

  const job = {
    id,
    status: 'queued',
    stage: 'queued',
    progress: 0,
    createdAt: now,
    updatedAt: now,
    brief: brief || '',
    input,
    warnings: [],
    output: null,
    transcript: null,
    analysisInsights: [],
    overlayPlan: null,
    refinementHistory: [],
    error: null,
  };

  jobs.set(id, job);
  persistJob(job);

  return job;
};

export const getJob = (id) => jobs.get(id) || null;

export const updateJob = (id, patch) => {
  const current = jobs.get(id);
  if (!current) {
    return null;
  }

  const merged = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  if (patch.warnings && current.warnings) {
    merged.warnings = [...current.warnings, ...patch.warnings];
  }

  jobs.set(id, merged);
  persistJob(merged);
  return merged;
};
