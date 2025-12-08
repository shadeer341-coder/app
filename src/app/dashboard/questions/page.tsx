
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
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
    return;
  }

  revalidatePath('/dashboard/questions');
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
    return;
  }

  revalidatePath('/dashboard/questions');
}

export default async function QuestionsPage() {
  const supabase = createSupabaseServerClient();
  const { data: categoriesData, error: categoriesError } = await supabase
    .from('question_categories')
    .select('*');
  const { data: questionsData, error: questionsError } = await supabase
    .from('questions')
    .select(`*, question_categories(name)`);

  if (categoriesError) {
    console.error('Error fetching categories:', categoriesError);
  }
  if (questionsError) {
    console.error('Error fetching questions:', questionsError);
  }
  
  const categories = (categoriesData as QuestionCategory[] | null) || [];
  const questions = (questionsData as Question[] | null) || [];

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

      <Tabs defaultValue="questions">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="questions">
          <Card id="question-management">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                    <CardTitle>Question Management</CardTitle>
                    <CardDescription>
                        Create new questions and assign them to a category.
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
                    {questions?.map(q => (
                      <TableRow key={q.id}>
                        <TableCell className="font-medium max-w-sm truncate">
                          {q.text}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {q.question_categories.name}
                          </Badge>
                        </TableCell>
                        <TableCell>
                           <Button variant="ghost" size="icon" disabled>
                             <Edit className="h-4 w-4" />
                           </Button>
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
        </TabsContent>

        <TabsContent value="categories">
          <Card id="category-management">
            <CardHeader>
               <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Question Categories</CardTitle>
                        <CardDescription>
                            Create and manage the categories for interview questions.
                        </CardDescription>
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button>
                                <PlusCircle className="mr-2" />
                                Add Category
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Category</DialogTitle>
                            </DialogHeader>
                             <form action={createCategory} className="space-y-4">
                                <div className="space-y-2">
                                <Label htmlFor="category-name">Category Name</Label>
                                <Input id="category-name" name="category-name" placeholder="e.g., About United Kingdom" required />
                                </div>
                                <div className="space-y-2">
                                <Label htmlFor="question-limit">Question Limit</Label>
                                <Input id="question-limit" name="question-limit" type="number" placeholder="e.g., 1" defaultValue="1" required/>
                                </div>
                                <Button type="submit">Create Category</Button>
                            </form>
                        </DialogContent>
                    </Dialog>
               </div>
            </CardHeader>
            <CardContent className="space-y-6">
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
        </TabsContent>
      </Tabs>
    </div>
  );
}

    