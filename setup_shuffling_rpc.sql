-- Run this in your Supabase SQL Editor to create the per-attempt category config
-- table and update the interview queue function.

CREATE TABLE IF NOT EXISTS public.category_attempt_config (
    category_id BIGINT NOT NULL REFERENCES public.question_categories(id) ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    question_count INTEGER NOT NULL DEFAULT 0 CHECK (question_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
    PRIMARY KEY (category_id, attempt_number)
);

CREATE INDEX IF NOT EXISTS category_attempt_config_attempt_number_idx
    ON public.category_attempt_config (attempt_number);

-- Backfill existing categories so all current categories have a baseline config
-- for attempts 1, 2, and 3. Admins can then adjust each attempt independently.
INSERT INTO public.category_attempt_config (category_id, attempt_number, question_count)
SELECT qc.id, attempt_series.attempt_number, qc.question_limit
FROM public.question_categories qc
CROSS JOIN generate_series(1, 3) AS attempt_series(attempt_number)
WHERE qc.name != 'Pre-Interview Checks'
ON CONFLICT (category_id, attempt_number) DO NOTHING;

CREATE OR REPLACE FUNCTION get_interview_queue(p_user_id UUID, p_session_id UUID DEFAULT NULL)
RETURNS TABLE (
    id BIGINT,
    text TEXT,
    category_id BIGINT,
    audio_url TEXT,
    tags TEXT[],
    read_time_seconds INTEGER,
    answer_time_seconds INTEGER,
    category_name TEXT
) AS $$
DECLARE
    cat RECORD;
    current_attempt_number INTEGER;
BEGIN
    -- Determine the user's current attempt number. Submitted sessions always have
    -- process_at set, while a resumable in-progress session does not.
    SELECT COALESCE(COUNT(*)::INTEGER, 0) + 1
    INTO current_attempt_number
    FROM interview_sessions s
    WHERE s.user_id = p_user_id
      AND (p_session_id IS NULL OR s.id <> p_session_id)
      AND s.process_at IS NOT NULL;

    -- 1. Always prioritize "Pre-Interview Checks"
    RETURN QUERY
    SELECT q.id, q.text, q.category_id, q.audio_url, q.tags, q.read_time_seconds, q.answer_time_seconds, c.name::TEXT as category_name
    FROM questions q
    JOIN question_categories c ON q.category_id = c.id
    WHERE q.is_active = true AND c.name = 'Pre-Interview Checks';

    -- 2. Loop through all other categories that have a configured question count
    -- for this attempt. If there is no exact match, fall back to the highest prior
    -- configured attempt for that category, then finally to the legacy question_limit.
    FOR cat IN
        SELECT
            c.id,
            c.name,
            COALESCE(
                exact_config.question_count,
                prior_config.question_count,
                c.question_limit,
                0
            ) AS configured_question_count
        FROM question_categories c
        LEFT JOIN LATERAL (
            SELECT cac.question_count
            FROM category_attempt_config cac
            WHERE cac.category_id = c.id
              AND cac.attempt_number = current_attempt_number
            LIMIT 1
        ) exact_config ON TRUE
        LEFT JOIN LATERAL (
            SELECT cac.question_count
            FROM category_attempt_config cac
            WHERE cac.category_id = c.id
              AND cac.attempt_number < current_attempt_number
            ORDER BY cac.attempt_number DESC
            LIMIT 1
        ) prior_config ON TRUE
        WHERE c.name != 'Pre-Interview Checks'
          AND COALESCE(
              exact_config.question_count,
              prior_config.question_count,
              c.question_limit,
              0
          ) > 0
        ORDER BY c.sort_order
    LOOP
        RETURN QUERY
        SELECT q.id, q.text, q.category_id, q.audio_url, q.tags, q.read_time_seconds, q.answer_time_seconds, cat.name::TEXT as category_name
        FROM questions q
        WHERE q.category_id = cat.id
          AND q.is_active = true
        ORDER BY
            (CASE
                WHEN p_session_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM interview_attempts a
                    WHERE a.question_id = q.id AND a.session_id = p_session_id
                ) THEN 0
                WHEN NOT EXISTS (
                    SELECT 1 FROM interview_attempts a
                    WHERE a.question_id = q.id AND a.user_id = p_user_id
                ) THEN 1
                ELSE 2
            END) ASC,
            random()
        LIMIT cat.configured_question_count;
    END LOOP;

    RETURN;
END;
$$ LANGUAGE plpgsql;
