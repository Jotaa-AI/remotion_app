# Supabase setup (persistencia de jobs)

Ejecuta este SQL en tu proyecto Supabase (SQL Editor):

```sql
create table if not exists public.jobs (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists jobs_updated_at_idx on public.jobs (updated_at desc);
```

Variables de entorno requeridas en Vercel:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`

Después de guardarlas, haz redeploy.
