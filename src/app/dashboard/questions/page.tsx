
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Question, QuestionCategory } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Edit } from 'lucide-react';
import { QuestionTableControls } from '@/components/admin/question-table-controls';

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
    redirect('/dashboard/questions?error=' + encodeURIComponent(error.message));
  } else {
    revalidatePath('/dashboard/questions');
    redirect('/dashboard/questions');
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
    redirect('/dashboard/questions?error=' + encodeURIComponent(error.message));
  } else {
    revalidatePath('/dashboard/questions');
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
        redirect('/dashboard/questions?error=' + encodeURIComponent(error.message));
    } else {
        revalidatePath('/dashboard/questions');
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
        <p className="text-muted-foreground">
          Manage interview question categories and the questions within them.
        </p>
      </div>

      <Card id="category-management">
        <CardHeader>
          <CardTitle>Question Categories</CardTitle>
          <CardDescription>
            Create and manage the categories for interview questions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <form action={createCategory} className="flex items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="category-name">Category Name</Label>
              <Input id="category-name" name="category-name" placeholder="e.g., About United Kingdom" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="question-limit">Question Limit</Label>
              <Input id="question-limit" name="question-limit" type="number" placeholder="e.g., 1" defaultValue="1" required className="w-24"/>
            </div>
            <Button type="submit">
              <PlusCircle className="mr-2 h-4 w-4"/>
              Add Category
            </Button>
          </form>
          <Separator />
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Question Limit</TableCell>
                  <TableCell className="w-[100px]">Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((cat: QuestionCategory) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell>{cat.question_limit}</TableCell>
                     <TableCell>
                       <Button variant="ghost" size="icon" disabled>
                         <Edit className="h-4 w-4" />
                       </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {(!categories || categories.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center">
                      No categories found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card id="question-management">
        <CardHeader>
            <div>
              <CardTitle>Question Management</CardTitle>
              <CardDescription>
                Create, edit, search and sort interview questions.
              </CardDescription>
            </div>
        </CardHeader>
        <CardContent>
           <QuestionTableControls
              categories={categories}
              questions={questions}
              createAction={createQuestion}
              updateAction={updateQuestion}
            />
        </CardContent>
      </Card>
    </div>
  );
}
