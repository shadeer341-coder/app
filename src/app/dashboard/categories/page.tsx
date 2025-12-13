

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
  
  // Get the max sort_order
  const { data: maxOrderData, error: maxOrderError } = await supabase
    .from('question_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  if (maxOrderError && maxOrderError.code !== 'PGRST116') { // Ignore error if no rows found
    console.error('Error getting max sort order:', maxOrderError);
    return { success: false, message: 'Could not determine category order.' };
  }

  const newSortOrder = (maxOrderData?.sort_order || 0) + 1;

  const { error } = await supabase
    .from('question_categories')
    .insert({ name: name, question_limit: limit, sort_order: newSortOrder });

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

async function moveCategory(categoryId: number, direction: 'up' | 'down') {
    'use server';
    const supabase = createSupabaseServerClient();

    const { data: allCategories, error: fetchError } = await supabase
        .from('question_categories')
        .select('id, sort_order')
        .order('sort_order', { ascending: true });

    if (fetchError) {
        return { success: false, message: 'Could not fetch categories to reorder.' };
    }

    const currentIndex = allCategories.findIndex(c => c.id === categoryId);
    if (currentIndex === -1) {
        return { success: false, message: 'Category not found.' };
    }
    
    let otherIndex = -1;
    if (direction === 'up') {
        if (currentIndex === 0) return { success: true, message: 'Already at the top.'};
        otherIndex = currentIndex - 1;
    } else {
        if (currentIndex === allCategories.length - 1) return { success: true, message: 'Already at the bottom.'};
        otherIndex = currentIndex + 1;
    }

    const categoryA = allCategories[currentIndex];
    const categoryB = allCategories[otherIndex];

    // Swap sort_order values using two update calls
    const { error: errorA } = await supabase
        .from('question_categories')
        .update({ sort_order: categoryB.sort_order })
        .eq('id', categoryA.id);

    if (errorA) {
        console.error('Error updating category A:', errorA);
        return { success: false, message: errorA.message };
    }

    const { error: errorB } = await supabase
        .from('question_categories')
        .update({ sort_order: categoryA.sort_order })
        .eq('id', categoryB.id);
    
    if (errorB) {
        console.error('Error updating category B:', errorB);
        // Attempt to revert the first change
        await supabase
            .from('question_categories')
            .update({ sort_order: categoryA.sort_order })
            .eq('id', categoryA.id);
        return { success: false, message: errorB.message };
    }

    revalidatePath('/dashboard/categories');
    return { success: true, message: 'Category moved.' };
}


export default async function CategoriesPage() {
  const supabase = createSupabaseServerClient();

  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*')
    .order('sort_order', { ascending: true });

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
          Create, view, and manage categories for organizing questions. Drag and drop to reorder.
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
                moveAction={moveCategory}
            />
        </CardHeader>
        <CardContent>
             <CategoryTableControls
                isTable
                categories={categories}
                createAction={createCategory}
                updateAction={updateCategory}
                deleteAction={deleteCategory}
                moveAction={moveCategory}
            />
        </CardContent>
      </Card>
    </div>
  );
}
