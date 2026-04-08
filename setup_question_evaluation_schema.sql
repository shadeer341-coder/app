-- Run this in your Supabase SQL editor to persist AI-generated evaluation schemas
-- for questions. The app can work without this column, but saving the generated
-- schema alongside each question makes evaluation more stable and efficient.

ALTER TABLE public.questions
ADD COLUMN IF NOT EXISTS evaluation_schema JSONB;

COMMENT ON COLUMN public.questions.evaluation_schema IS
'Internal AI-generated evaluation schema used to score direct and conditional questions more accurately.';
