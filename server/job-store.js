import fs from 'fs';
import path from 'path';
import {v4 as uuid} from 'uuid';
import {config} from './config.js';

const jobs = new Map();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const hasSupabase = Boolean(supabaseUrl && supabaseServiceRoleKey);

const persistJobToFile = (job) => {
  try {
    const filepath = path.join(config.jobsDir, `${job.id}.json`);
    fs.writeFileSync(filepath, JSON.stringify(job, null, 2));
  } catch {
    // noop (best effort)
  }
};

const supabaseFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: supabaseServiceRoleKey,
      Authorization: `Bearer ${supabaseServiceRoleKey}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Supabase HTTP ${res.status}: ${text || 'request failed'}`);
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return null;
};

const persistJobToSupabase = async (job) => {
  if (!hasSupabase) return;

  const url = `${supabaseUrl}/rest/v1/jobs?on_conflict=id`;
  const payload = [
    {
      id: job.id,
      payload: job,
      updated_at: new Date().toISOString(),
    },
  ];

  await supabaseFetch(url, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(payload),
  });
};

const fetchJobFromSupabase = async (id) => {
  if (!hasSupabase) return null;

  const url = `${supabaseUrl}/rest/v1/jobs?select=payload&id=eq.${encodeURIComponent(id)}&limit=1`;
  const rows = await supabaseFetch(url, {method: 'GET'});
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  return rows[0]?.payload || null;
};

export const createJob = async ({file, sourceUrl, sourceType, brief}) => {
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
    scenePlan: null,
    sceneQuality: null,
    refinementHistory: [],
    reviewState: {
      mode: 'sequential',
      currentIndex: 0,
      approvedIds: [],
      rejectedIds: [],
      completed: false,
    },
    error: null,
  };

  jobs.set(id, job);
  persistJobToFile(job);
  if (hasSupabase) {
    await persistJobToSupabase(job);
  }

  return job;
};

export const getJob = async (id) => {
  const local = jobs.get(id);
  if (local) {
    return local;
  }

  const fromSupabase = await fetchJobFromSupabase(id).catch(() => null);
  if (fromSupabase) {
    jobs.set(id, fromSupabase);
    return fromSupabase;
  }

  return null;
};

export const updateJob = async (id, patch) => {
  const current = await getJob(id);
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
  persistJobToFile(merged);
  if (hasSupabase) {
    await persistJobToSupabase(merged);
  }

  return merged;
};
