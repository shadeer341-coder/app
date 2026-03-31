-- Run this in your Supabase SQL Editor to create the question shuffling function.

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
BEGIN
    -- 1. Always prioritize "Pre-Interview Checks"
    RETURN QUERY
    SELECT q.id, q.text, q.category_id, q.audio_url, q.tags, q.read_time_seconds, q.answer_time_seconds, c.name::TEXT as category_name
    FROM questions q
    JOIN question_categories c ON q.category_id = c.id
    WHERE q.is_active = true AND c.name = 'Pre-Interview Checks';

    -- 2. Loop through all other active categories with a limit > 0
    FOR cat IN 
        SELECT c.id, c.name, c.question_limit 
        FROM question_categories c 
        WHERE c.name != 'Pre-Interview Checks' AND c.question_limit > 0
        ORDER BY c.sort_order
    LOOP
        -- For each category, we return exactly `question_limit` rows.
        -- We order by buckets to prioritize logic, and randomize within those buckets:
        -- Bucket 0: Questions already answered in the current session (must be included)
        -- Bucket 1: Unseen questions (never answered by this user across any session)
        -- Bucket 2: Seen questions (answered by this user, but NOT in this session)
        -- `random()` kicks in to shuffle items that fall into the same bucket equally.

        RETURN QUERY
        SELECT q.id, q.text, q.category_id, q.audio_url, q.tags, q.read_time_seconds, q.answer_time_seconds, cat.name::TEXT as category_name
        FROM questions q
        WHERE q.category_id = cat.id 
          AND q.is_active = true
        ORDER BY 
            (CASE 
                -- Bucket 0: Current session attempts
                WHEN p_session_id IS NOT NULL AND EXISTS (
                    SELECT 1 FROM interview_attempts a 
                    WHERE a.question_id = q.id AND a.session_id = p_session_id
                ) THEN 0
                
                -- Bucket 1: Unseen questions (not in attempts for user)
                WHEN NOT EXISTS (
                    SELECT 1 FROM interview_attempts a 
                    WHERE a.question_id = q.id AND a.user_id = p_user_id
                ) THEN 1
                
                -- Bucket 2: Seen questions (fallback)
                ELSE 2 
            END) ASC,
            random()
        LIMIT cat.question_limit;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;
