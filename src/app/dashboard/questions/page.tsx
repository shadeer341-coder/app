

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { QuestionTableControls } from '@/components/admin/question-table-controls';
import { CategoryTableControls } from '@/components/admin/category-table-controls';

export const dynamic = 'force-dynamic';

async function createCategory(formData: FormData) {
  'use server';

  const name = String(formData.get('category-name'));
  const limit = Number(formData.get('question-limit'));

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from('question_categories')
    .insert({ name: name, question_limit: limit });

  if (error) {
    console.error('Error creating category:', error.message);
    return { success: false, message: error.message };
  } else {
    revalidatePath('/dashboard/questions');
    return { success: true, message: "Category created successfully." };
  }
}

async function updateCategory(formData: FormData) {
    'use server';

    const id = Number(formData.get('category-id'));
    const name = String(formData.get('category-name'));
    const limit = Number(formData.get('question-limit'));

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
        .from('question_categories')
        .update({ name, question_limit: limit })
        .eq('id', id);

    if (error) {
        console.error('Error updating category:', error.message);
        return { success: false, message: error.message };
    } else {
        revalidatePath('/dashboard/questions');
        return { success: true, message: "Category updated successfully." };
    }
}

async function deleteCategory(formData: FormData) {
    'use server';

    const id = Number(formData.get('category-id'));

    const supabase = createSupabaseServerClient();
    
    // Check if any questions are associated with this category
    const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('id')
        .eq('category_id', id)
        .limit(1);

    if (questionsError) {
        console.error('Error checking for questions in category:', questionsError.message);
        return { success: false, message: questionsError.message };
    }

    if (questions.length > 0) {
        const errorMessage = "Cannot delete category: it is currently associated with one or more questions.";
        console.error(errorMessage);
        return { success: false, message: errorMessage };
    }

    // If no questions, proceed with deletion
    const { error: deleteError } = await supabase
        .from('question_categories')
        .delete()
        .eq('id', id);

    if (deleteError) {
        console.error('Error deleting category:', deleteError.message);
        return { success: false, message: deleteError.message };
    } else {
        revalidatePath('/dashboard/questions');
        return { success: true, message: "Category deleted successfully." };
    }
}


async function createQuestion(formData: FormData) {
  'use server';

  const supabase = createSupabaseServerClient();
  const questionData = {
    text: String(formData.get('question-text')),
    category_id: Number(formData.get('question-category')),
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
    const questionData = {
      text: String(formData.get('question-text')),
      category_id: Number(formData.get('question-category')),
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


export default async function QuestionsPage({ searchParams }: { searchParams: { [key: string]: string | undefined }}) {
  const supabase = createSupabaseServerClient();

  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*')
    .order('name', { ascending: true });
    
  let query = supabase.from('questions').select(`*, question_categories(name)`);

  if (searchParams.q) {
      query = query.ilike('text', `%${searchParams.q}%`);
  }
  if (searchParams.category && searchParams.category !== 'all') {
      query = query.eq('category_id', searchParams.category);
  }
  
  const sortBy = searchParams.sortBy || 'created_at';
  const order = searchParams.order || 'desc';
  query = query.order(sortBy, { ascending: order === 'asc' });

  const { data: questionsData, error: questionsError } = await query;


  if (categoriesError) console.error('Error fetching categories:', categoriesError);
  if (questionsError) console.error('Error fetching questions:', questionsError);
  
  const categories = (categoriesData as QuestionCategory[] | null) || [];
  const questions = (questionsData as any[] | null) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Question Bank
        </h1>
      </div>

      <Card id="category-management">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Question Categories</CardTitle>
          <CategoryTableControls
                categories={categories}
                createAction={createCategory}
                updateAction={updateCategory}
                deleteAction={deleteCategory}
            />
        </CardHeader>
        <CardContent>
             <CategoryTableControls
                isTable
                categories={categories}
                createAction={createCategory}
                updateAction={updateCategory}
                deleteAction={deleteCategory}
            />
        </CardContent>
      </Card>

      <Card id="question-management">
        <CardHeader>
            <div>
              <CardTitle>Questions</CardTitle>
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
        </CardContent>
      </Card>
    </div>
  );
}
