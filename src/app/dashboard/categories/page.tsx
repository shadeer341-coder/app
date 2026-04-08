

import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { CategoryAttemptConfig, QuestionCategory } from '@/lib/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CategoryTableControls } from '@/components/admin/category-table-controls';

export const dynamic = 'force-dynamic';

const CONFIGURED_ATTEMPT_NUMBERS = [1, 2, 3] as const;

function parseAttemptConfigCounts(formData: FormData) {
  const configs = CONFIGURED_ATTEMPT_NUMBERS.map((attemptNumber) => {
    const rawValue = Number(formData.get(`attempt-${attemptNumber}-count`));

    if (!Number.isInteger(rawValue) || rawValue < 0) {
      return { attempt_number: attemptNumber, question_count: NaN };
    }

    return {
      attempt_number: attemptNumber,
      question_count: rawValue,
    };
  });

  if (configs.some((config) => Number.isNaN(config.question_count))) {
    return { success: false as const, message: 'Attempt question counts must be whole numbers greater than or equal to 0.' };
  }

  return { success: true as const, configs };
}

async function createCategory(formData: FormData) {
  'use server';

  const name = String(formData.get('category-name'));
  const parsedConfigs = parseAttemptConfigCounts(formData);

  if (!parsedConfigs.success) {
    return parsedConfigs;
  }

  const limit = Math.max(...parsedConfigs.configs.map((config) => config.question_count), 0);

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

  const { data: createdCategory, error } = await supabase
    .from('question_categories')
    .insert({ name: name, question_limit: limit, sort_order: newSortOrder })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating category:', error.message);
    return { success: false, message: error.message };
  }

  if (!createdCategory) {
    return { success: false, message: 'Category was created, but its attempt configuration could not be initialized.' };
  }

  const { error: configError } = await supabase
    .from('category_attempt_config')
    .insert(
      parsedConfigs.configs.map((config) => ({
        category_id: createdCategory.id,
        attempt_number: config.attempt_number,
        question_count: config.question_count,
      }))
    );

  if (configError) {
    console.error('Error creating category attempt configs:', configError.message);

    await supabase
      .from('question_categories')
      .delete()
      .eq('id', createdCategory.id);

    return { success: false, message: configError.message };
  }

  revalidatePath('/dashboard/categories');
  return { success: true, message: "Category created successfully." };
}

async function updateCategory(formData: FormData) {
    'use server';

    const id = Number(formData.get('category-id'));
    const name = String(formData.get('category-name'));
    const parsedConfigs = parseAttemptConfigCounts(formData);

    if (!parsedConfigs.success) {
        return parsedConfigs;
    }

    const limit = Math.max(...parsedConfigs.configs.map((config) => config.question_count), 0);

    const supabase = createSupabaseServerClient();
    const { error } = await supabase
        .from('question_categories')
        .update({ name, question_limit: limit })
        .eq('id', id);

    if (error) {
        console.error('Error updating category:', error.message);
        return { success: false, message: error.message };
    }

    const { error: configError } = await supabase
        .from('category_attempt_config')
        .upsert(
            parsedConfigs.configs.map((config) => ({
                category_id: id,
                attempt_number: config.attempt_number,
                question_count: config.question_count,
            })),
            { onConflict: 'category_id,attempt_number' }
        );

    if (configError) {
        console.error('Error updating category attempt configs:', configError.message);
        return { success: false, message: configError.message };
    }

    revalidatePath('/dashboard/categories');
    return { success: true, message: "Category updated successfully." };
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

    const { error: configDeleteError } = await supabase
        .from('category_attempt_config')
        .delete()
        .eq('category_id', id);

    if (configDeleteError) {
        console.error('Error deleting category attempt configs:', configDeleteError.message);
        return { success: false, message: configDeleteError.message };
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
        .neq('name', 'Pre-Interview Checks')
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
    .neq('name', 'Pre-Interview Checks')
    .order('sort_order', { ascending: true });

  if (categoriesError) {
      console.error('Error fetching categories:', categoriesError.message);
  }

  const categoryIds = (categoriesData || []).map((category) => category.id);

  let attemptConfigs: CategoryAttemptConfig[] = [];
  if (categoryIds.length > 0) {
    const { data: configsData, error: configsError } = await supabase
      .from('category_attempt_config')
      .select('*')
      .in('category_id', categoryIds)
      .order('attempt_number', { ascending: true });

    if (configsError) {
      console.error('Error fetching category attempt configs:', configsError.message);
    } else {
      attemptConfigs = (configsData as CategoryAttemptConfig[] | null) || [];
    }
  }

  const attemptConfigsByCategoryId = new Map<number, CategoryAttemptConfig[]>();
  for (const config of attemptConfigs) {
    const existingConfigs = attemptConfigsByCategoryId.get(config.category_id) || [];
    existingConfigs.push(config);
    attemptConfigsByCategoryId.set(config.category_id, existingConfigs);
  }

  const categories = ((categoriesData as QuestionCategory[] | null) || []).map((category) => ({
    ...category,
    attempt_configs: attemptConfigsByCategoryId.get(category.id) || [],
  }));

  return (
    <div className="space-y-6">
       <div>
        <h1 className="font-headline text-3xl font-bold tracking-tight">
          Question Categories
        </h1>
        <p className="text-muted-foreground">
          Create, view, and manage categories and per-attempt question counts for organizing interviews.
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
