
"use client";

import { useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import type { QuestionCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type CategoryTableControlsProps = {
  categories: QuestionCategory[];
  createAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
  updateAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
  deleteAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
};

export function CategoryTableControls({ categories, createAction, updateAction, deleteAction }: CategoryTableControlsProps) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<QuestionCategory | null>(null);

  const handleEditClick = (category: QuestionCategory) => {
    setEditingCategory(category);
    setEditDialogOpen(true);
  };
  
  const handleFormAction = (action: (formData: FormData) => Promise<{ success: boolean, message: string }>, formData: FormData, closeDialog: () => void) => {
    startTransition(async () => {
      const result = await action(formData);
      if (result.success) {
        toast({ title: 'Success', description: result.message });
        closeDialog();
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <form action={(formData) => handleFormAction(createAction, formData, () => setAddDialogOpen(false))} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input id="category-name" name="category-name" placeholder="e.g., About United Kingdom" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-limit">Question Limit</Label>
                <Input id="question-limit" name="question-limit" type="number" placeholder="e.g., 1" defaultValue="1" required className="w-24" />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Category
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Question Limit</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((cat) => (
              <TableRow key={cat.id}>
                <TableCell className="font-medium">{cat.name}</TableCell>
                <TableCell>{cat.question_limit}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center">
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(cat)}>
                        <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the category.
                                    You cannot delete categories that have questions associated with them.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <form action={(formData) => handleFormAction(deleteAction, formData, () => {})}>
                                    <input type="hidden" name="category-id" value={cat.id} />
                                    <AlertDialogAction asChild>
                                        <Button type="submit" variant="destructive" disabled={isPending}>
                                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Delete
                                        </Button>
                                    </AlertDialogAction>
                                </form>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {(!categories || categories.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="text-center">No categories found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {editingCategory && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
            </DialogHeader>
            <form action={(formData) => handleFormAction(updateAction, formData, () => setEditDialogOpen(false))} className="space-y-4">
              <input type="hidden" name="category-id" value={editingCategory.id} />
              <div className="space-y-2">
                <Label htmlFor="category-name-edit">Category Name</Label>
                <Input id="category-name-edit" name="category-name" defaultValue={editingCategory.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="question-limit-edit">Question Limit</Label>
                <Input id="question-limit-edit" name="question-limit" type="number" defaultValue={editingCategory.question_limit} required className="w-24" />
              </div>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
