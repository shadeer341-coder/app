
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

export const dynamic = 'force-dynamic';

const ITEMS_PER_PAGE = 10;

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

  const questionData = {
    text: String(formData.get('question-text')),
    category_id: Number(formData.get('question-category')),
    level: String(formData.get('question-level')) as QuestionLevel,
    tags: tags.length > 0 ? tags : null,
  };

  const { error } = await supabase.from('questions').insert(questionData);

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


    const questionData = {
      text: String(formData.get('question-text')),
      category_id: Number(formData.get('question-category')),
      level: String(formData.get('question-level')) as QuestionLevel,
      tags: tags.length > 0 ? tags : null,
    };

    const { error } = await supabase.from('questions').update(questionData).eq('id', questionId);

    if (error) {
        console.error('Error updating question:', error.message);
        return { success: false, message: error.message };
    } else {
        revalidatePath('/dashboard/questions');
        return { success: true, message: "Question updated successfully." };
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
