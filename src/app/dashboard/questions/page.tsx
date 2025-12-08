import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { QuestionCategory } from "@/lib/types";
import { createSupabaseServerClient, createSupabaseServerActionClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function QuestionsPage() {
  const supabase = createSupabaseServerClient();
  const { data: categories, error } = await supabase.from('question_categories').select('*');

  if (error) {
    console.error("Error fetching categories:", error);
  }

  async function createCategory(formData: FormData) {
    'use server'
    const name = String(formData.get('category-name'))
    const limit = Number(formData.get('question-limit'))

    const supabase = createSupabaseServerActionClient();

    const { error } = await supabase
      .from('question_categories')
      .insert({ name: name, question_limit: limit });

    if (error) {
      console.error('Error creating category:', error);
      // TODO: Handle error feedback to the user
      return;
    }

    revalidatePath('/dashboard/questions');
    redirect('/dashboard/questions');
  }

  return (
    <div className="space-y-6">
       <div>
          <h1 className="font-headline text-3xl font-bold tracking-tight">
            Question Management
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
    </div>
  );
}
