
"use client"

import { useState } from 'react';
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
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
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
import type { Question, QuestionCategory } from '@/lib/types';


type QuestionTableControlsProps = {
    questions: any[];
    categories: QuestionCategory[];
    createAction: (formData: FormData) => Promise<void>;
    updateAction: (formData: FormData) => Promise<void>;
    deleteAction: (formData: FormData) => Promise<void>;
};

export function QuestionTableControls({ questions, categories, createAction, updateAction, deleteAction }: QuestionTableControlsProps) {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<any | null>(null);

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
            <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                    <Label htmlFor="search-questions">Search Questions</Label>
                    <Input
                        id="search-questions"
                        placeholder="Search by question text..."
                        defaultValue={searchParams.get('q') || ''}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>
                <div className="flex-1 md:flex-none md:w-48">
                    <Label htmlFor="filter-category">Filter by Category</Label>
                    <Select
                        defaultValue={searchParams.get('category') || 'all'}
                        onValueChange={handleFilter}
                    >
                        <SelectTrigger id="filter-category">
                            <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Categories</SelectItem>
                            {categories?.map(cat => (
                                <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
            <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="space-y-2">
                    <Label>Sort by</Label>
                    <RadioGroup defaultValue={searchParams.get('sortBy') || 'created_at'} onValueChange={handleSortBy} className="flex flex-row md:flex-col gap-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="created_at" id="sort-date" />
                            <Label htmlFor="sort-date">Date</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="text" id="sort-text" />
                            <Label htmlFor="sort-text">Question Text</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="category_id" id="sort-category" />
                            <Label htmlFor="sort-category">Category</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="space-y-2">
                    <Label>Order</Label>
                    <RadioGroup defaultValue={searchParams.get('order') || 'desc'} onValueChange={handleSort} className="flex flex-row gap-2">
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="asc" id="order-asc" />
                            <Label htmlFor="order-asc">Asc</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="desc" id="order-desc" />
                            <Label htmlFor="order-desc">Desc</Label>
                        </div>
                    </RadioGroup>
                </div>
                <div className="md:ml-auto">
                     <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
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
                            <form action={async (formData) => {
                                await createAction(formData);
                                setAddDialogOpen(false);
                            }} className="space-y-4">
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
                                        <form action={deleteAction}>
                                            <input type="hidden" name="question-id" value={q.id} />
                                            <AlertDialogAction asChild>
                                                <Button type="submit" variant="destructive">Delete</Button>
                                            </AlertDialogAction>
                                        </form>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
                        <form action={async (formData) => {
                            await updateAction(formData);
                            setEditDialogOpen(false);
                        }} className="space-y-4">
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
                            <Button type="submit">Save Changes</Button>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    )
}
