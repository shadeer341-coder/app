
"use client"

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
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
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { QuestionCategory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';


type QuestionTableControlsProps = {
    questions: any[];
    categories: QuestionCategory[];
    createAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    updateAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    deleteAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
};

export function QuestionTableControls({ questions, categories, createAction, updateAction, deleteAction }: QuestionTableControlsProps) {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

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

    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    const handleFilter = (categoryId: string) => {
        const params = new URLSearchParams(searchParams);
        if (categoryId && categoryId !== 'all') {
            params.set('category', categoryId);
        } else {
            params.delete('category');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    const handleSort = (order: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('order', order);
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    
    const handleSortBy = (sortBy: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('sortBy', sortBy);
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    const handleEditClick = (question: any) => {
        setEditingQuestion(question);
        setEditDialogOpen(true);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                 <div className="flex-1 w-full md:w-auto">
                    <Input
                        id="search-questions"
                        placeholder="Search by question text..."
                        defaultValue={searchParams.get('q') || ''}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                     <Select
                        defaultValue={searchParams.get('category') || 'all'}
                        onValueChange={handleFilter}
                    >
                        <SelectTrigger id="filter-category" className="w-full md:w-48">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories?.map(cat => (
                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                     <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="w-full md:w-auto">
                            <PlusCircle className="mr-2" />
                            Add Question
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Question</DialogTitle>
                            </DialogHeader>
                            <form action={(formData) => handleFormAction(createAction, formData, () => setAddDialogOpen(false))} className="space-y-4">
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
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Question
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
            <div className="flex gap-8 items-center border rounded-md p-4 bg-muted/50">
                <div className="flex items-center gap-2">
                    <Label className="text-sm">Sort by</Label>
                    <RadioGroup defaultValue={searchParams.get('sortBy') || 'created_at'} onValueChange={handleSortBy} className="flex flex-row gap-2">
                        <Label htmlFor="sort-date" className="font-normal border rounded-full px-3 py-1 text-xs cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors">
                            <RadioGroupItem value="created_at" id="sort-date" className="sr-only" />
                            Date
                        </Label>
                        <Label htmlFor="sort-text" className="font-normal border rounded-full px-3 py-1 text-xs cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors">
                            <RadioGroupItem value="text" id="sort-text" className="sr-only" />
                            Question Text
                        </Label>
                        <Label htmlFor="sort-category" className="font-normal border rounded-full px-3 py-1 text-xs cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors">
                            <RadioGroupItem value="category_id" id="sort-category" className="sr-only" />
                           Category
                        </Label>
                    </RadioGroup>
                </div>
                 <div className="flex items-center gap-2">
                    <Label className="text-sm">Order</Label>
                    <RadioGroup defaultValue={searchParams.get('order') || 'desc'} onValueChange={handleSort} className="flex flex-row gap-2">
                         <Label htmlFor="order-asc" className="font-normal border rounded-full px-3 py-1 text-xs cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors">
                            <RadioGroupItem value="asc" id="order-asc" className="sr-only" />
                            Asc
                        </Label>
                         <Label htmlFor="order-desc" className="font-normal border rounded-full px-3 py-1 text-xs cursor-pointer has-[:checked]:bg-primary has-[:checked]:text-primary-foreground has-[:checked]:border-primary transition-colors">
                            <RadioGroupItem value="desc" id="order-desc" className="sr-only" />
                            Desc
                        </Label>
                    </RadioGroup>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
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
                        <TableCell className="text-right">
                           <div className="inline-flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(q)}>
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
                                                This action cannot be undone. This will permanently delete this question.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <form action={(formData) => handleFormAction(deleteAction, formData, () => {})}>
                                                <input type="hidden" name="question-id" value={q.id} />
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
            
            {editingQuestion && (
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Question</DialogTitle>
                        </DialogHeader>
                        <form action={(formData) => handleFormAction(updateAction, formData, () => setEditDialogOpen(false))} className="space-y-4">
                            <input type="hidden" name="question-id" value={editingQuestion.id} />
                            <div className="space-y-2">
                                <Label htmlFor="question-text-edit">Question Text</Label>
                                <Textarea id="question-text-edit" name="question-text" defaultValue={editingQuestion.text} required />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="question-category-edit">Category</Label>
                                <Select name="question-category" defaultValue={String(editingQuestion.category_id)} required>
                                    <SelectTrigger id="question-category-edit">
                                        <SelectValue placeholder="Select a category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.map(cat => (
                                            <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
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
    )
}
