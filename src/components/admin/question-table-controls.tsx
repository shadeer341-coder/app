
"use client"

import { useState, useTransition, useRef } from 'react';
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
import { PlusCircle, Edit, Trash2, Loader2, Sparkles, Tag, PlayCircle, Radio } from 'lucide-react';
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
import type { QuestionCategory, QuestionLevel, Question } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { suggestQuestion } from '@/ai/flows/suggest-question';
import { TagInput } from '../ui/tag-input';


type QuestionTableControlsProps = {
    questions: Question[];
    categories: QuestionCategory[];
    createAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    updateAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    deleteAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    // generateAudioAction: (questionId: number, questionText: string) => Promise<{ success: boolean, message: string }>;
};

const levelOptions = [
    "All Levels",
    "Foundation + Degree",
    "Degree (Undergraduate)",
    "Top-Up / Final Year",
    "Masters (Postgraduate)",
];

export function QuestionTableControls({ questions, categories, createAction, updateAction, deleteAction, /* generateAudioAction */ }: QuestionTableControlsProps) {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    // const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);

    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at');
    const [order, setOrder] = useState(searchParams.get('order') || 'desc');
    
    const [isSuggesting, setIsSuggesting] = useState(false);
    // const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null);
    const questionTextRef = useRef<HTMLTextAreaElement>(null);
    const editQuestionTextRef = useRef<HTMLTextAreaElement>(null);

    // const handlePlayAudio = (audioUrl: string) => {
    //     if (playingAudio) {
    //         playingAudio.pause();
    //         if (playingAudio.src === audioUrl) {
    //             setPlayingAudio(null);
    //             return;
    //         }
    //     }
        
    //     const audio = new Audio(audioUrl);
    //     setPlayingAudio(audio);
    //     audio.play();
    //     audio.onended = () => {
    //         setPlayingAudio(null);
    //     };
    //     audio.onerror = () => {
    //         toast({ variant: 'destructive', title: 'Error', description: 'Could not play audio.' });
    //         setPlayingAudio(null);
    //     }
    // }


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
        params.set('page', '1');
        if (term) {
            params.set('q', term);
        } else {
            params.delete('q');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, 300);

    const handleFilter = (categoryId: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        if (categoryId && categoryId !== 'all') {
            params.set('category', categoryId);
        } else {
            params.delete('category');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    const handleLevelFilter = (level: string) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        if (level && level !== 'All Levels') {
            params.set('level', level);
        } else {
            params.delete('level');
        }
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    const handleSortOrder = (newOrder: string) => {
        setOrder(newOrder);
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        params.set('order', newOrder);
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    
    const handleSortBy = (newSortBy: string) => {
        setSortBy(newSortBy);
        const params = new URLSearchParams(searchParams);
        params.set('page', '1');
        params.set('sortBy', newSortBy);
        replace(`${pathname}?${params.toString()}`, { scroll: false });
    }

    const handleEditClick = (question: any) => {
        setEditingQuestion(question);
        setEditDialogOpen(true);
    };

    const handleSuggestQuestion = async () => {
        if (!selectedCategory) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a category first.'});
            return;
        }
        setIsSuggesting(true);
        try {
            const result = await suggestQuestion({ categoryName: selectedCategory.name });
            if (questionTextRef.current) {
                questionTextRef.current.value = result.suggestion;
            }
             if (result.suggestion.startsWith('There was an error')) {
                toast({
                    variant: 'destructive',
                    title: 'AI Suggestion Failed',
                    description: result.suggestion,
                });
            } else {
                 toast({
                    title: 'Suggestion Ready',
                    description: 'An AI-powered suggestion has been added.',
                });
            }
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: `Could not fetch an AI suggestion. ${error.message}` });
        } finally {
            setIsSuggesting(false);
        }
    };
    
    // const handleGenerateAudio = async () => {
    //     if (!editingQuestion || !editQuestionTextRef.current) return;
    //     setIsGeneratingAudio(true);
    //     startTransition(async () => {
    //         const result = await generateAudioAction(editingQuestion.id, editQuestionTextRef.current?.value || editingQuestion.text);
    //         if (result.success) {
    //             toast({ title: 'Success', description: result.message });
    //             setEditDialogOpen(false);
    //         } else {
    //             toast({ variant: 'destructive', title: 'Error', description: result.message });
    //         }
    //         setIsGeneratingAudio(false);
    //     });
    // }

    const sortOptions = [
        { value: 'created_at', label: 'Date' },
        { value: 'text', label: 'Question Text' },
        { value: 'category_id', label: 'Category' },
    ];

    const orderOptions = [
        { value: 'asc', label: 'Asc' },
        { value: 'desc', label: 'Desc' },
    ];


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
                     <Select
                        defaultValue={searchParams.get('level') || 'All Levels'}
                        onValueChange={handleLevelFilter}
                    >
                        <SelectTrigger id="filter-level" className="w-full md:w-48">
                            <SelectValue placeholder="Select a level" />
                        </SelectTrigger>
                        <SelectContent>
                            {levelOptions.map(level => (
                                <SelectItem key={level} value={level}>{level}</SelectItem>
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
                        <DialogContent className="sm:max-w-[525px]">
                            <DialogHeader>
                                <DialogTitle>Create New Question</DialogTitle>
                            </DialogHeader>
                            <form action={(formData) => handleFormAction(createAction, formData, () => setAddDialogOpen(false))} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="question-text">Question Text</Label>
                                    <Textarea id="question-text" name="question-text" placeholder="e.g., Tell me about a time you faced a challenge." required ref={questionTextRef} />
                                </div>
                                 <div className="space-y-2">
                                    <Label htmlFor="question-tags">Tags</Label>
                                    <TagInput id="question-tags" name="question-tags" placeholder="Add a tag and press Enter" />
                                    <p className="text-xs text-muted-foreground">Keywords expected in the answer.</p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="question-category">Category</Label>
                                        <div className="flex gap-2">
                                            <Select 
                                                name="question-category" 
                                                required 
                                                onValueChange={(value) => {
                                                    const category = categories.find(c => String(c.id) === value);
                                                    if (category) {
                                                        setSelectedCategory({id: String(category.id), name: category.name});
                                                    }
                                                }}
                                            >
                                                <SelectTrigger id="question-category">
                                                <SelectValue placeholder="Select a category" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                {categories?.map(cat => (
                                                    <SelectItem key={cat.id} value={String(cat.id)}>{cat.name}</SelectItem>
                                                ))}
                                                </SelectContent>
                                            </Select>
                                            <Button type="button" variant="outline" size="icon" onClick={handleSuggestQuestion} disabled={isSuggesting || !selectedCategory}>
                                                {isSuggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                                <span className="sr-only">Suggest Question</span>
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="question-level">Level</Label>
                                        <Select name="question-level" defaultValue="All Levels" required>
                                            <SelectTrigger id="question-level">
                                                <SelectValue placeholder="Select a level" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {levelOptions.map(level => (
                                                    <SelectItem key={level} value={level}>{level}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
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
                     <div className="flex flex-row gap-2">
                        {sortOptions.map(option => (
                            <Button
                                key={option.value}
                                variant={sortBy === option.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleSortBy(option.value)}
                                className="rounded-full px-3 py-1 text-xs h-auto font-normal"
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>
                 <div className="flex items-center gap-2">
                    <Label className="text-sm">Order</Label>
                    <div className="flex flex-row gap-2">
                         {orderOptions.map(option => (
                            <Button
                                key={option.value}
                                variant={order === option.value ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleSortOrder(option.value)}
                                className="rounded-full px-3 py-1 text-xs h-auto font-normal"
                            >
                                {option.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="border rounded-md">
                <Table>
                <TableHeader>
                    <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {questions?.map((q) => (
                    <TableRow key={q.id}>
                        <TableCell className="font-medium max-w-sm truncate">
                        {/* <div className="flex items-center gap-2">
                             {q.audio_url && (
                                <Button variant="ghost" size="icon" onClick={() => handlePlayAudio(q.audio_url!)} className="h-7 w-7">
                                    <PlayCircle className={cn("h-5 w-5", playingAudio?.src === q.audio_url && "text-primary")} />
                                </Button>
                            )}
                            {q.text}
                        </div> */}
                        {q.text}
                        </TableCell>
                        <TableCell>
                        <Badge variant="outline">
                            {q.question_categories?.name || 'N/A'}
                        </Badge>
                        </TableCell>
                        <TableCell>
                           <Badge variant={q.level === 'All Levels' ? 'secondary' : 'default'} className={cn(q.level?.includes('Postgraduate') && 'bg-accent text-accent-foreground')}>{q.level || 'All Levels'}</Badge>
                        </TableCell>
                         <TableCell>
                            <div className="flex flex-wrap gap-1">
                                {q.tags?.map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="font-normal">
                                        <Tag className="w-3 h-3 mr-1" />
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
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
                        <TableCell colSpan={5} className="text-center">
                            No questions found.
                        </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </div>
            
            {editingQuestion && (
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                    <DialogContent className="sm:max-w-[525px]">
                        <DialogHeader>
                            <DialogTitle>Edit Question</DialogTitle>
                        </DialogHeader>
                        <form action={(formData) => handleFormAction(updateAction, formData, () => setEditDialogOpen(false))} className="space-y-4">
                            <input type="hidden" name="question-id" value={editingQuestion.id} />
                            <div className="space-y-2">
                                <Label htmlFor="question-text-edit">Question Text</Label>
                                <Textarea id="question-text-edit" name="question-text" defaultValue={editingQuestion.text} required ref={editQuestionTextRef} />
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="question-tags-edit">Tags</Label>
                                <TagInput id="question-tags-edit" name="question-tags" placeholder="Add a tag and press Enter" defaultValue={editingQuestion.tags || []} />
                                <p className="text-xs text-muted-foreground">Keywords expected in the answer.</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                <div className="space-y-2">
                                    <Label htmlFor="question-level-edit">Level</Label>
                                    <Select name="question-level" defaultValue={editingQuestion.level || 'All Levels'} required>
                                        <SelectTrigger id="question-level-edit">
                                            <SelectValue placeholder="Select a level" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {levelOptions.map(level => (
                                                <SelectItem key={level} value={level}>{level}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </Button>
                                {/* {!editingQuestion.audio_url && (
                                    <Button type="button" variant="outline" onClick={handleGenerateAudio} disabled={isGeneratingAudio || isPending}>
                                        {isGeneratingAudio ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                                        Generate Audio
                                    </Button>
                                )} */}
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
}
