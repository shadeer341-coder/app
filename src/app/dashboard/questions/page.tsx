
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory, QuestionLevel } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QuestionTableControls } from '@/components/admin/question-table-controls';
import { PaginationControls } from '@/components/ui/pagination';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function generateAndSaveAudio(questionId: number, questionText: string) {
    if (!process.env.OPENAI_API_KEY) {
        console.error("OpenAI API key is not configured. Skipping audio generation.");
        return { success: false, message: "OpenAI API key is not configured." };
    }

    try {
        const supabase = createSupabaseServerClient();
        const speechResponse = await openai.audio.speech.create({
            model: "tts-1",
            voice: "alloy",
            input: questionText,
        });
        
        const audioBuffer = Buffer.from(await speechResponse.arrayBuffer());
        const filePath = `public/${questionId}_${Date.now()}.mp3`;

        const { error: uploadError } = await supabase.storage
            .from('audio-questions')
            .upload(filePath, audioBuffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) {
            throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
            .from('audio-questions')
            .getPublicUrl(filePath);

        if (!publicUrlData) {
            throw new Error("Could not get public URL for audio file.");
        }

        const { error: updateError } = await supabase
            .from('questions')
            .update({ audio_url: publicUrlData.publicUrl })
            .eq('id', questionId);

        if (updateError) {
            throw updateError;
        }

        revalidatePath('/dashboard/questions');
        return { success: true, message: "Audio generated and linked successfully.", audioUrl: publicUrlData.publicUrl };

    } catch (error) {
        if (error instanceof Error) {
            console.error('Error generating or saving audio:', error.message);
            return { success: false, message: error.message };
        } else {
            console.error('An unknown error occurred during audio processing:', error);
            return { success: false, message: 'An unknown error occurred during audio processing.' };
        }
    }
}


async function createQuestion(formData: FormData) {
  'use server';

  const supabase = createSupabaseServerClient();
  
  const tagsRaw = String(formData.get('question-tags') || '[]');
  let tags: string[] = [];
  try {
    tags = JSON.parse(tagsRaw);
    if (!Array.isArray(tags)) tags = [];
  } catch (e) {
    // Keep tags as empty array if parsing fails
  }

  const questionText = String(formData.get('question-text'));
  const questionData = {
    text: questionText,
    category_id: Number(formData.get('question-category')),
    level: String(formData.get('question-level')) as QuestionLevel,
    tags: tags.length > 0 ? tags : null,
  };

  const { data, error } = await supabase.from('questions').insert(questionData).select().single();

  if (error) {
    console.error('Error creating question:', error.message);
    return { success: false, message: error.message };
  } else {
    // Generate audio asynchronously, don't block the response
    if (data?.id) {
        generateAndSaveAudio(data.id, questionText);
    }
    revalidatePath('/dashboard/questions');
    return { success: true, message: "Question created successfully. Audio generation is in progress." };
  }
}

async function updateQuestion(formData: FormData) {
    'use server';

    const supabase = createSupabaseServerClient();
    const questionId = Number(formData.get('question-id'));

    const tagsRaw = String(formData.get('question-tags') || '[]');
    let tags: string[] = [];
    try {
        tags = JSON.parse(tagsRaw);
        if (!Array.isArray(tags)) tags = [];
    } catch(e) {
        // Keep tags as empty array if parsing fails
    }

    const questionText = String(formData.get('question-text'));
    const questionData = {
      text: questionText,
      category_id: Number(formData.get('question-category')),
      level: String(formData.get('question-level')) as QuestionLevel,
      tags: tags.length > 0 ? tags : null,
    };

    // Check if the text has changed to decide whether to regenerate audio
    const { data: existingQuestion, error: fetchError } = await supabase
        .from('questions')
        .select('text')
        .eq('id', questionId)
        .single();
    
    if (fetchError) {
        console.error('Error fetching existing question:', fetchError.message);
        // Continue with update anyway
    }

    const { error } = await supabase.from('questions').update(questionData).eq('id', questionId);

    if (error) {
        console.error('Error updating question:', error.message);
        return { success: false, message: error.message };
    } else {
        const textHasChanged = existingQuestion?.text !== questionText;
        if (textHasChanged) {
            generateAndSaveAudio(questionId, questionText);
        }
        revalidatePath('/dashboard/questions');
        return { success: true, message: `Question updated successfully. ${textHasChanged ? "Audio regeneration is in progress." : ""}` };
    }
}

async function deleteQuestion(formData: FormData) {
    'use server';

    const supabase = createSupabaseServerClient();
    const questionId = Number(formData.get('question-id'));

    const { error } = await supabase.from('questions').delete().eq('id', questionId);

    if (error) {
        console.error('Error deleting question:', error.message);
        return { success: false, message: error.message };
    } else {
        revalidatePath('/dashboard/questions');
        return { success: true, message: "Question deleted successfully." };
    }
}

async function generateQuestionAudioAction(questionId: number, questionText: string) {
    'use server';
    return await generateAndSaveAudio(questionId, questionText);
}


export default async function QuestionsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const supabase = createSupabaseServerClient();
  const currentPage = Number(searchParams?.page || 1);

  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*')
    .order('name', { ascending: true });
    
  let query = supabase.from('questions').select(`*, question_categories(name)`);
  let countQuery = supabase.from('questions').select('id', { count: 'exact', head: true });

  if (searchParams.q && typeof searchParams.q === 'string') {
      const filter = `%${searchParams.q}%`;
      query = query.ilike('text', filter);
      countQuery = countQuery.ilike('text', filter);
  }
  if (searchParams.category && searchParams.category !== 'all') {
      query = query.eq('category_id', searchParams.category);
      countQuery = countQuery.eq('category_id', searchParams.category);
  }
  if (searchParams.level && searchParams.level !== 'all') {
    query = query.eq('level', searchParams.level);
    countQuery = countQuery.eq('level', searchParams.level);
  }
  
  const sortBy = (searchParams.sortBy as string) || 'created_at';
  const order = (searchParams.order as string) || 'desc';
  query = query.order(sortBy, { ascending: order === 'asc' });

  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;
  query = query.range(from, to);

  const { data: questionsData, error: questionsError } = await query;
  const { count: totalCount, error: countError } = await countQuery;


  if (categoriesError) console.error('Error fetching categories:', categoriesError);
  if (questionsError) console.error('Error fetching questions:', questionsError);
  if (countError) console.error('Error counting questions:', countError);

  
  const categories = (categoriesData as QuestionCategory[] | null) || [];
  const questions = (questionsData as any[] | null) || [];
  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <Card id="question-management">
        <CardHeader>
            <div>
              <CardTitle>All Questions</CardTitle>
            </div>
        </CardHeader>
        <CardContent>
           <QuestionTableControls
              categories={categories}
              questions={questions}
              createAction={createQuestion}
              updateAction={updateQuestion}
              deleteAction={deleteQuestion}
              generateAudioAction={generateQuestionAudioAction}
            />
          <div className="mt-6 flex justify-center">
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
