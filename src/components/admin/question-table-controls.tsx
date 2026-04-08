
"use client"

import { useEffect, useRef, useState, useTransition } from 'react';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { PlusCircle, Edit, Trash2, Loader2, Sparkles, Tag, PlayCircle, Radio, Clock, Timer, Mic, Square, CheckCircle, AlertTriangle, PenTool, BrainCircuit, Target } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import type { GenerateInterviewFeedbackOutput } from '@/ai/flows/generate-interview-feedback';
import { TagInput } from '../ui/tag-input';


type QuestionTableControlsProps = {
    questions: Question[];
    categories: QuestionCategory[];
    createAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    updateAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    deleteAction: (formData: FormData) => Promise<{ success: boolean, message: string }>;
    testAction: (formData: FormData) => Promise<{ success: boolean, message: string, feedback?: GenerateInterviewFeedbackOutput, questionText?: string, tags?: string[] }>;
    // generateAudioAction: (questionId: number, questionText: string) => Promise<{ success: boolean, message: string }>;
};

const levelOptions = [
    "All Levels",
    "Foundation + Degree",
    "Degree (Undergraduate)",
    "Top-Up / Final Year",
    "Masters (Postgraduate)",
];

export function QuestionTableControls({ questions, categories, createAction, updateAction, deleteAction, testAction, /* generateAudioAction */ }: QuestionTableControlsProps) {
    const searchParams = useSearchParams();
    const { replace } = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();

    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
    const [testDialogOpen, setTestDialogOpen] = useState(false);
    const [testingQuestion, setTestingQuestion] = useState<Question | null>(null);
    const [testFeedback, setTestFeedback] = useState<GenerateInterviewFeedbackOutput | null>(null);
    const [testAnswer, setTestAnswer] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [recordingElapsedSeconds, setRecordingElapsedSeconds] = useState(0);
    // const [playingAudio, setPlayingAudio] = useState<HTMLAudioElement | null>(null);

    const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'created_at');
    const [order, setOrder] = useState(searchParams.get('order') || 'desc');
    
    const [isSuggesting, setIsSuggesting] = useState(false);
    // const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<{id: string, name: string} | null>(null);
    const questionTextRef = useRef<HTMLTextAreaElement>(null);
    const editQuestionTextRef = useRef<HTMLTextAreaElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const streamRef = useRef<MediaStream | null>(null);

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

    const handleTestClick = (question: Question) => {
        setTestingQuestion(question);
        setTestFeedback(null);
        setTestAnswer('');
        setIsTranscribing(false);
        setRecordingElapsedSeconds(0);
        setTestDialogOpen(true);
    };

    const stopRecordingSession = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }

        setIsRecording(false);
    };

    useEffect(() => {
        if (!isRecording) return;

        const intervalId = window.setInterval(() => {
            setRecordingElapsedSeconds((prev) => prev + 1);
        }, 1000);

        return () => window.clearInterval(intervalId);
    }, [isRecording]);

    useEffect(() => {
        return () => {
            stopRecordingSession();
        };
    }, []);

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

    const handleTestAction = (formData: FormData) => {
        startTransition(async () => {
            const result = await testAction(formData);

            if (result.success && result.feedback) {
                setTestFeedback(result.feedback);
                toast({ title: 'Feedback Ready', description: result.message });
            } else {
                setTestFeedback(null);
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    const startAnswerRecording = async () => {
        try {
            setRecordingElapsedSeconds(0);
            audioChunksRef.current = [];

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            const recorderOptions = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? { mimeType: 'audio/webm;codecs=opus' }
                : undefined;

            mediaRecorderRef.current = new MediaRecorder(stream, recorderOptions);
            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                void transcribeRecordedAnswer(blob);
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (error: any) {
            console.error('Could not start audio recording:', error);
            toast({
                variant: 'destructive',
                title: 'Recording unavailable',
                description: 'Please allow microphone access in your browser settings.',
            });
        }
    };

    const transcribeRecordedAnswer = async (audioBlob: Blob) => {
        setIsTranscribing(true);

        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'question-test-answer.webm');

            const response = await fetch('/api/transcribe', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(errorBody || 'Transcription failed.');
            }

            const result = await response.json();
            setTestAnswer(result.transcript || '');
            toast({
                title: 'Transcript ready',
                description: 'The recording was transcribed with whisper-1.',
            });
        } catch (error: any) {
            console.error('Transcription failed:', error);
            toast({
                variant: 'destructive',
                title: 'Transcription failed',
                description: error.message || 'Could not transcribe the recording.',
            });
        } finally {
            setIsTranscribing(false);
        }
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
                                    <p className="text-xs text-muted-foreground">Use tags as answer hints. Conditional logic is detected automatically from the question.</p>
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
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="read-time">Read Time (sec)</Label>
                                        <Input id="read-time" name="read-time" type="number" placeholder="e.g., 15" defaultValue="15" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="answer-time">Answer Time (sec)</Label>
                                        <Input id="answer-time" name="answer-time" type="number" placeholder="e.g., 60" defaultValue="60" required />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="question-active">Status</Label>
                                        <Select name="question-active" defaultValue="true" required>
                                            <SelectTrigger id="question-active">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="true">Active</SelectItem>
                                                <SelectItem value="false">Inactive</SelectItem>
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
                    <TableHead>Timers</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {questions?.map((q) => (
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
                        <TableCell>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Clock className="w-3 h-3" />
                                    Read: {q.read_time_seconds || 15}s
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Timer className="w-3 h-3" />
                                    Answer: {q.answer_time_seconds || 60}s
                                </div>
                            </div>
                        </TableCell>
                        <TableCell>
                           <Badge variant={q.is_active !== false ? 'default' : 'secondary'}>
                               {q.is_active !== false ? 'Active' : 'Inactive'}
                           </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                           <div className="inline-flex items-center">
                                <Button variant="ghost" size="icon" onClick={() => handleTestClick(q)}>
                                    <PlayCircle className="h-4 w-4" />
                                </Button>
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
                        <TableCell colSpan={7} className="text-center">
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
                                <p className="text-xs text-muted-foreground">Use tags as answer hints. Conditional logic is detected automatically from the question.</p>
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
                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="read-time-edit">Read Time (sec)</Label>
                                    <Input id="read-time-edit" name="read-time" type="number" placeholder="e.g., 15" defaultValue={editingQuestion.read_time_seconds || 15} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="answer-time-edit">Answer Time (sec)</Label>
                                    <Input id="answer-time-edit" name="answer-time" type="number" placeholder="e.g., 60" defaultValue={editingQuestion.answer_time_seconds || 60} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="question-active-edit">Status</Label>
                                    <Select name="question-active" defaultValue={editingQuestion.is_active !== false ? "true" : "false"} required>
                                        <SelectTrigger id="question-active-edit">
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Active</SelectItem>
                                            <SelectItem value="false">Inactive</SelectItem>
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

            {testingQuestion && (
                <Dialog
                    open={testDialogOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            stopRecordingSession();
                        }
                        setTestDialogOpen(open);
                    }}
                >
                    <DialogContent className="sm:max-w-[960px] max-h-[90vh] overflow-y-auto gap-0 p-0">
                        <DialogHeader className="border-b bg-gradient-to-br from-primary/10 via-background to-background px-6 py-5">
                            <div className="flex flex-col gap-3 pr-8">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                                        Test Lab
                                    </Badge>
                                    <Badge variant="outline">{testingQuestion.question_categories?.name || 'Uncategorized'}</Badge>
                                    <Badge variant={testingQuestion.level === 'All Levels' ? 'secondary' : 'default'} className={cn(testingQuestion.level?.includes('Postgraduate') && 'bg-accent text-accent-foreground')}>
                                        {testingQuestion.level || 'All Levels'}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <DialogTitle className="text-2xl font-headline tracking-tight">Try Question</DialogTitle>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
                            <div className="space-y-6 px-6 py-6">
                                <div className="rounded-2xl border bg-card p-5 shadow-sm">
                                    <div className="flex flex-wrap items-start justify-between gap-3">
                                        <div className="space-y-2">
                                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Prompt</p>
                                            <p className="text-base leading-7 text-foreground">{testingQuestion.text}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="rounded-xl border bg-muted/40 px-3 py-2">
                                                <p className="text-muted-foreground">Read</p>
                                                <p className="font-semibold text-foreground">{testingQuestion.read_time_seconds || 15}s</p>
                                            </div>
                                            <div className="rounded-xl border bg-muted/40 px-3 py-2">
                                                <p className="text-muted-foreground">Answer</p>
                                                <p className="font-semibold text-foreground">{testingQuestion.answer_time_seconds || 60}s</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex flex-wrap gap-2">
                                        {(testingQuestion.tags || []).length > 0 ? (
                                            testingQuestion.tags?.map((tag) => (
                                                <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1 font-normal">
                                                    <Tag className="mr-1 h-3 w-3" />
                                                    {tag}
                                                </Badge>
                                            ))
                                        ) : (
                                            <p className="text-sm text-muted-foreground">No tags configured for this question.</p>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-background p-5 shadow-sm">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Voice Capture</p>
                                            <h3 className="text-lg font-semibold tracking-tight">Record and Transcribe</h3>
                                        </div>
                                        <div className={cn(
                                            "flex h-11 min-w-[88px] items-center justify-center rounded-2xl border px-3 text-sm font-medium",
                                            isRecording
                                                ? "border-destructive/30 bg-destructive/10 text-destructive"
                                                : isTranscribing
                                                    ? "border-primary/30 bg-primary/10 text-primary"
                                                : "border-border bg-background text-muted-foreground"
                                        )}>
                                            {isRecording ? `${recordingElapsedSeconds}s` : isTranscribing ? 'Working' : 'Ready'}
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-4">
                                        <Progress
                                            value={isRecording ? Math.min((recordingElapsedSeconds / 120) * 100, 100) : isTranscribing ? 100 : 0}
                                            className="h-2"
                                        />

                                        <div className="flex flex-wrap gap-2">
                                            {!isRecording ? (
                                                <Button type="button" className="rounded-full px-5" onClick={startAnswerRecording} disabled={isTranscribing}>
                                                    <Mic className="mr-2 h-4 w-4" />
                                                    Record Answer
                                                </Button>
                                            ) : (
                                                <Button type="button" variant="destructive" className="rounded-full px-5" onClick={stopRecordingSession}>
                                                    <Square className="mr-2 h-4 w-4" />
                                                    Stop Recording
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <form action={handleTestAction} className="space-y-4">
                                    <input type="hidden" name="question-id" value={testingQuestion.id} />
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <Label htmlFor="sample-answer" className="text-base font-semibold">Transcript / Sample Answer</Label>
                                            </div>
                                            <Badge variant="outline" className="rounded-full px-3 py-1">
                                                Same AI Rules
                                            </Badge>
                                        </div>
                                        <Textarea
                                            id="sample-answer"
                                            name="sample-answer"
                                            placeholder="Type the answer you want to test against the live AI evaluator."
                                            value={testAnswer}
                                            onChange={(e) => setTestAnswer(e.target.value)}
                                            rows={10}
                                            className="min-h-[220px] rounded-2xl border-muted-foreground/20 bg-background"
                                            required
                                        />
                                    </div>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Button type="submit" disabled={isPending} className="rounded-full px-6">
                                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Generate Feedback
                                        </Button>
                                    </div>
                                </form>
                            </div>

                            <div className="border-t bg-muted/20 px-6 py-6 lg:border-l lg:border-t-0">
                                {testFeedback ? (
                                    <div className="space-y-5">
                                        <div className="rounded-2xl border bg-background p-5 shadow-sm">
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Feedback Preview</p>
                                                    <h3 className="mt-1 text-xl font-semibold tracking-tight">Instant Result</h3>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        This mirrors the structure used in actual interview feedback.
                                                    </p>
                                                </div>
                                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
                                                    {testFeedback.score}%
                                                </div>
                                            </div>
                                        </div>

                                        <Card className="rounded-2xl border-0 shadow-sm">
                                            <CardHeader className="pb-3">
                                                <CardTitle className="flex items-center gap-2 text-lg">
                                                    <BrainCircuit className="h-5 w-5 text-primary" />
                                                    Question Feedback
                                                </CardTitle>
                                                <CardDescription>
                                                    Preview of how this question will score and explain the answer quality.
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                {testFeedback.weaknesses === '' ? (
                                                    <Alert className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/50">
                                                        <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                        <AlertTitle className="text-green-800 dark:text-green-300">Answered Perfectly</AlertTitle>
                                                        <AlertDescription className="text-green-700 dark:text-green-400">
                                                            {testFeedback.strengths}
                                                        </AlertDescription>
                                                    </Alert>
                                                ) : (
                                                    <>
                                                        <div className="rounded-xl border bg-muted/35 p-4">
                                                            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">Submitted Answer</p>
                                                            <blockquote className="mt-2 border-l-2 border-primary/40 pl-4 italic text-sm leading-6 text-foreground/90">
                                                                {testAnswer || 'No transcript available.'}
                                                            </blockquote>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <h4 className="flex items-center gap-2 text-sm font-semibold">
                                                                <CheckCircle className="h-4 w-4 text-green-500" />
                                                                Strengths
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground leading-6">{testFeedback.strengths}</p>
                                                        </div>
                                                        <Separator />
                                                        <div className="space-y-2">
                                                            <h4 className="flex items-center gap-2 text-sm font-semibold">
                                                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                                                Areas for Improvement
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground leading-6">{testFeedback.weaknesses || 'None.'}</p>
                                                        </div>
                                                        <Separator />
                                                        <div className="space-y-2">
                                                            <h4 className="flex items-center gap-2 text-sm font-semibold">
                                                                <PenTool className="h-4 w-4 text-blue-500" />
                                                                Clarity & Grammar
                                                            </h4>
                                                            <p className="text-sm text-muted-foreground leading-6">{testFeedback.grammarFeedback}</p>
                                                        </div>
                                                    </>
                                                )}

                                                <Separator />
                                                <div className="space-y-2">
                                                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                                                        <Target className="h-4 w-4 text-primary" />
                                                        Overall Performance
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground leading-6">{testFeedback.overallPerformance}</p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                ) : (
                                    <div className="flex h-full min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed bg-background/70 px-6 text-center">
                                        <div className="rounded-2xl bg-primary/10 p-4">
                                            <PlayCircle className="h-8 w-8 text-primary" />
                                        </div>
                                        <h3 className="mt-4 text-xl font-semibold tracking-tight">Feedback preview will appear here</h3>
                                        <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                                            Record or type an answer on the left, then generate feedback to inspect the exact evaluator output before publishing this question.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            )}

        </div>
    );
}
