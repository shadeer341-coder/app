import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { QuestionCategory, Question } from "@/lib/types";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage() {
  const supabase = createSupabaseServerClient();
  const { data: categories, error: categoriesError } = await supabase.from('question_categories').select('*');
  const { data: questions, error: questionsError } = await supabase
    .from('questions')
    .select(`*, question_categories(name)`);

  if (categoriesError) {
    console.error("Error fetching categories:", categoriesError);
  }
  if (questionsError) {
    console.error("Error fetching questions:", questionsError);
  }

  async function createCategory(formData: FormData) {
    'use server'
    
    const name = String(formData.get('category-name'));
    const limit = Number(formData.get('question-limit'));
    
    const supabase = createSupabaseServerClient();

    const { error } = await supabase
      .from('question_categories')
      .insert({ name: name, question_limit: limit });

    if (error) {
      console.error('Error creating category:', error.message);
      redirect('/dashboard/questions?error=' + encodeURIComponent(error.message));
      return;
    }

    revalidatePath('/dashboard/questions');
    redirect('/dashboard/questions');
  }

  async function createQuestion(formData: FormData) {
    'use server'

    const supabase = createSupabaseServerClient();
    
    const questionData = {
        text: String(formData.get('question-text')),
        category_id: Number(formData.get('question-category')),
    };

    const { error } = await supabase.from('questions').insert(questionData);

    if (error) {
        console.error('Error creating question:', error.message);
        redirect('/dashboard/questions?error=' + encodeURIComponent(error.message));
        return;
    }

    revalidatePath('/dashboard/questions');
    redirect('/dashboard/questions');
  }

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
            Create and manage the categories for interview questions. Each category can have a limit on how many questions are asked from it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Create New Category</h3>
              <form action={createCategory} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">Category Name</Label>
                  <Input id="category-name" name="category-name" placeholder="e.g., About United Kingdom" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="question-limit">Question Limit</Label>
                  <Input id="question-limit" name="question-limit" type="number" placeholder="e.g., 1" defaultValue="1" required/>
                </div>
                <Button>Create Category</Button>
              </form>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Existing Categories</h3>
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Question Limit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories && categories.map((cat: QuestionCategory) => (
                      <TableRow key={cat.id}>
                        <TableCell>{cat.name}</TableCell>
                        <TableCell className="text-right">{cat.question_limit}</TableCell>
                      </TableRow>
                    ))}
                    {(!categories || categories.length === 0) && (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center">No categories found.</TableCell>
                        </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card id="question-management">
        <CardHeader>
          <CardTitle>Question Management</CardTitle>
          <CardDescription>
            Create new questions and assign them to a category.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-semibold text-lg mb-4">Create New Question</h3>
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
                <Button>Create Question</Button>
              </form>
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-4">Existing Questions</h3>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Question</TableHead>
                                <TableHead>Category</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(questions as Question[] | null)?.map(q => (
                                <TableRow key={q.id}>
                                    <TableCell className="font-medium max-w-sm truncate">{q.text}</TableCell>
                                    <TableCell><Badge variant="outline">{q.question_categories.name}</Badge></TableCell>
                                </TableRow>
                            ))}
                            {(!questions || questions.length === 0) && (
                                <TableRow>
                                    <TableCell colSpan={2} className="text-center">No questions found.</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
