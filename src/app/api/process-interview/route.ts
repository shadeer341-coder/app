
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { processInterviewInBackground } from '@/lib/process-interview';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createSupabaseServerClient({ service: true });

  // Add a 30-second delay to allow for manual testing.
  // This prevents the cron job from immediately picking up a newly submitted interview.
  const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

  // 1. Find the oldest pending interview session that is older than 30 seconds
  const { data: session, error: findError } = await supabase
    .from('interview_sessions')
    .select('id')
    .eq('status', 'pending')
    .lt('created_at', thirtySecondsAgo) // Only select sessions created more than 30s ago
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (findError || !session) {
    if (findError && findError.code !== 'PGRST116') { // PGRST116: No rows found
        console.error('Error finding pending session:', findError);
    }
    return NextResponse.json({ message: 'No pending interviews to process.' });
  }
  
  const { id: sessionId } = session;

  try {
    // 2. Mark the session as 'processing' to prevent other jobs from picking it up
    const { error: updateError } = await supabase
        .from('interview_sessions')
        .update({ status: 'processing' })
        .eq('id', sessionId);
    
    if (updateError) throw new Error(`Failed to update session status to processing: ${updateError.message}`);
    
    // 3. Perform the actual AI analysis
    await processInterviewInBackground(sessionId);
    
    return NextResponse.json({ success: true, message: `Successfully processed session ${sessionId}.` });

  } catch (error: any) {
    console.error(`Failed to process session ${sessionId}:`, error.message);
    // If an error occurs, mark the session as 'failed'
    await supabase
        .from('interview_sessions')
        .update({ status: 'failed' })
        .eq('id', sessionId);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
