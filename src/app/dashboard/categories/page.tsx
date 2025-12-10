
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { QuestionCategory } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
    revalidatePath('/dashboard/categories');
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
        revalidatePath('/dashboard/categories');
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
        revalidatePath('/dashboard/categories');
        return { success: true, message: "Category deleted successfully." };
    }
}


export default async function CategoriesPage() {
  const supabase = createSupabaseServerClient();

  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*')
    .order('name', { ascending: true });

  if (categoriesError) {
      console.error('Error fetching categories:', categoriesError.message);
  }
    
  const categories = (categoriesData as QuestionCategory[] | null) || [];

  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Question Categories
        </h1>
        <p className="text-muted-foreground">
          Create, view, and manage categories for organizing questions.
        </p>
      </div>

      <Card id="category-management">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>All Categories</CardTitle>
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
    </div>
  );
}
