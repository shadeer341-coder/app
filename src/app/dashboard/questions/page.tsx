

import { revalidatePath } from 'next/cache';
import { createSupabaseServerActionClient, createSupabaseServerClient, SupabaseClient } from '@/lib/supabase/server';
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

async function createQuestion(formData: FormData) {
  'use server';

  const supabase = createSupabaseServerActionClient();
  
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
    read_time_seconds: Number(formData.get('read-time')),
    answer_time_seconds: Number(formData.get('answer-time')),
  };

  const { data, error } = await supabase.from('questions').insert(questionData).select().single();

  if (error) {
    console.error('Error creating question:', error.message);
    return { success: false, message: error.message };
  } else {
    revalidatePath('/dashboard/questions');
    return { success: true, message: "Question created successfully." };
  }
}

async function updateQuestion(formData: FormData) {
    'use server';

    const supabase = createSupabaseServerActionClient();
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
      read_time_seconds: Number(formData.get('read-time')),
      answer_time_seconds: Number(formData.get('answer-time')),
    };

    const { error } = await supabase.from('questions').update(questionData).eq('id', questionId);

    if (error) {
        console.error('Error updating question:', error.message);
        return { success: false, message: error.message };
    } else {
        revalidatePath('/dashboard/questions');
        return { success: true, message: `Question updated successfully.` };
    }
}

async function deleteQuestion(formData: FormData) {
    'use server';

    const supabase = createSupabaseServerActionClient();
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


export default async function QuestionsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined }}) {
  const supabase = createSupabaseServerClient();
  const currentPage = Number(searchParams?.page || 1);

  // Fetch categories, excluding the special "Pre-Interview Checks" category
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*')
    .neq('name', 'Pre-Interview Checks')
    .order('name', { ascending: true });
    
  // Get the ID of the special category to exclude its questions
  const { data: specialCategory } = await supabase
    .from('question_categories')
    .select('id')
    .eq('name', 'Pre-Interview Checks')
    .single();

  let query = supabase.from('questions').select(`*, question_categories(name)`);
  let countQuery = supabase.from('questions').select('id', { count: 'exact', head: true });

  // Exclude questions from the special category
  if (specialCategory) {
    query = query.neq('category_id', specialCategory.id);
    countQuery = countQuery.neq('category_id', specialCategory.id);
  }

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
  const questions = (questionsData as Question[] | null) || [];
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
