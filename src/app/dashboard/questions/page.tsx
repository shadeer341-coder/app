
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
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PlusCircle, Edit } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

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

  const sortBy = searchParams.sortBy || 'created_at';
  const order = searchParams.order || 'desc';

  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*')
    .order('name', { ascending: true });

  const { data: questionsData, error: questionsError } = await supabase
    .from('questions')
    .select(`*, question_categories(name)`)
    .order(sortBy, { ascending: order === 'asc' });

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
  }
  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
  }
  
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
                  <TableHead>Name</TableHead>
                  <TableHead>Question Limit</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Question Management</CardTitle>
              <CardDescription>
                Create, edit, and sort interview questions.
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Question</DialogTitle>
                </DialogHeader>
                <form action={createQuestion} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question-text">Question Text</Label>
                    <Textarea id="question-text" name="question-text" placeholder="e.g., Tell me about a time you faced a challenge." required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="question-category">Category</Label>
                    <Select name="question-category" required>
                      <SelectTrigger id="question-category">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map(cat => (
                          <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit">Create Question</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end gap-2 mb-4">
                <Button variant="outline" asChild>
                    <a href={`?sortBy=text&order=${sortBy === 'text' && order === 'asc' ? 'desc' : 'asc'}`}>Sort by Question</a>
                </Button>
                <Button variant="outline" asChild>
                    <a href={`?sortBy=category_id&order=${sortBy === 'category_id' && order === 'asc' ? 'desc' : 'asc'}`}>Sort by Category</a>
                </Button>
            </div>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Question</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions?.map((q: any) => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium max-w-sm truncate">
                      {q.text}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {q.question_categories?.name || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                       <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Question</DialogTitle>
                            </DialogHeader>
                            <form action={updateQuestion} className="space-y-4">
                                <input type="hidden" name="question-id" value={q.id} />
                                <div className="space-y-2">
                                    <Label htmlFor="question-text">Question Text</Label>
                                    <Textarea id="question-text" name="question-text" defaultValue={q.text} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="question-category">Category</Label>
                                    <Select name="question-category" defaultValue={String(q.category_id)} required>
                                        <SelectTrigger id="question-category">
                                            <SelectValue placeholder="Select a category" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {categories?.map(cat => (
                                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button type="submit">Save Changes</Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
                {!questions ||
                  (questions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center">
                        No questions found.
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    