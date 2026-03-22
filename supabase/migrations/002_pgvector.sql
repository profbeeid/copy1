-- Phase 3: pgvector for semantic exemplar retrieval
-- Run this migration after 2,000+ exemplars are collected

-- Enable pgvector extension (already available on Supabase)
create extension if not exists vector;

-- Add embedding columns if not already present (idempotent)
alter table exemplars      add column if not exists embedding vector(1536);
alter table anti_exemplars add column if not exists embedding vector(1536);

-- IVFFlat indexes for cosine similarity search
-- lists = sqrt(n_rows) is a reasonable starting point; tune after data grows
create index if not exists exemplars_embedding_idx
  on exemplars using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists anti_exemplars_embedding_idx
  on anti_exemplars using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Phase 3 retrieval query (reference — executed from Edge Function):
--
-- SELECT id, brief, output, weighted_overall,
--        score_hook, score_specificity, score_voice_fit, score_tension, score_originality
-- FROM exemplars
-- WHERE brand = $1 AND task_type = $2
-- ORDER BY embedding <=> $3   -- $3 = query vector as text representation
-- LIMIT 5;
