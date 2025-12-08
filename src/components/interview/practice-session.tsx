
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, QuestionCategory, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Video, StopCircle, RefreshCw, Send, AlertTriangle } from 'lucide-react';

type PracticeSessionProps = {
  categories: QuestionCategory[];
  questions: Pick<Question, 'id' | 'text' | 'category_id'>[];
  user: User | null;
};

type Stage = 'select_category' | 'show_question' | 'recording' | 'reviewing' | 'submitting';

export function PracticeSession({ categories, questions, user }: PracticeSessionProps) {
  const [stage, setStage] = useState<Stage>('select_category');
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Pick<Question, 'id' | 'text'>>_id'> | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const router = useRouter();

  const handleSelectCategory = (category: QuestionCategory) => {
    const categoryQuestions = questions.filter(q => q.category_id === category.id);
    if (categoryQuestions.length === 0) {
        toast({
            variant: 'destructive',
            title: 'No Questions',
            description: `There are no questions in the "${category.name}" category.`,
        });
        return;
    }
    const randomIndex = Math.floor(Math.random() * categoryQuestions.length);
    const randomQuestion = categoryQuestions[randomIndex];
    
    setSelectedCategory(category);
    setCurrentQuestion(randomQuestion);
    setStage('show_question');
  };

  const getCameraPermission = useCallback(async () => {
    if (hasCameraPermission) return true;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setHasCameraPermission(true);
      return true;
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera and microphone permissions in your browser settings.',
      });
      return false;
    }
  }, [hasCameraPermission, toast]);

  const startRecording = async () => {
    const permissionGranted = await getCameraPermission();
    if (!permissionGranted || !videoRef.current?.srcObject) return;

    setIsRecording(true);
    setRecordedVideo(null);
    recordedChunksRef.current = [];

    const stream = videoRef.current.srcObject as MediaStream;
    mediaRecorderRef.current = new MediaRecorder(stream);

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setRecordedVideo(url);
      setIsRecording(false);
      setStage('reviewing');
    };

    mediaRecorderRef.current.start();
    setStage('recording');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRerecord = () => {
    setRecordedVideo(null);
    recordedChunksRef.current = [];
    setStage('show_question');
  };
  
  const handleSubmit = async () => {
      // Placeholder for submission logic
      setStage('submitting');
      toast({
          title: "Submitting...",
          description: "Your interview is being submitted for analysis. Please wait.",
      });

      // This is where you would convert the blob to a data URI and send to the AI flow
      // For now, we'll just simulate a delay and redirect
      setTimeout(() => {
          toast({
              title: "Submission Successful!",
              description: "You will be redirected to the interviews page shortly.",
          });
          // In a real app, you'd redirect to the new interview attempt page:
          // router.push(`/dashboard/interviews/new-attempt-id`);
          router.push('/dashboard/interviews');
      }, 3000);
  };

  useEffect(() => {
    if (stage === 'show_question') {
      getCameraPermission();
    }
  }, [stage, getCameraPermission]);


  return (
    <Card>
      {stage === 'select_category' && (
        <>
          <CardHeader>
            <CardTitle>Step 1: Choose a Category</CardTitle>
            <CardDescription>Select the type of question you want to practice.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => (
              <Button key={cat.id} variant="outline" size="lg" className="p-8 text-lg" onClick={() => handleSelectCategory(cat)}>
                {cat.name}
              </Button>
            ))}
          </CardContent>
        </>
      )}

      {(stage === 'show_question' || stage === 'recording') && (
        <>
            <CardHeader>
                <CardTitle>Step 2: Record Your Answer</CardTitle>
                <CardDescription>You are practicing a question from the <strong>{selectedCategory?.name}</strong> category.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Question</AlertTitle>
                    <AlertDescription className="text-lg font-semibold">
                        {currentQuestion?.text}
                    </AlertDescription>
                </Alert>

                <div className="relative aspect-video w-full rounded-md border bg-secondary overflow-hidden">
                    <video ref={videoRef} className="w-full h-full" autoPlay muted playsInline />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <h3 className="text-xl font-bold">Camera Access Required</h3>
                            <p>Please allow camera and microphone access to record.</p>
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                    {stage === 'show_question' && (
                        <Button size="lg" onClick={startRecording} disabled={hasCameraPermission !== true}>
                            <Video className="mr-2" /> Start Recording
                        </Button>
                    )}
                    {stage === 'recording' && (
                         <Button size="lg" variant="destructive" onClick={stopRecording}>
                            <StopCircle className="mr-2" /> Stop Recording
                        </Button>
                    )}
                </div>
            </CardContent>
        </>
      )}
      
      {(stage === 'reviewing' || stage === 'submitting') && recordedVideo && (
          <>
            <CardHeader>
                <CardTitle>Step 3: Review Your Recording</CardTitle>
                <CardDescription>Watch your performance. You can re-record or submit for AI feedback.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="aspect-video w-full rounded-md border bg-secondary overflow-hidden">
                    <video src={recordedVideo} className="w-full h-full" controls playsInline />
                </div>
                <div className="flex justify-center gap-4">
                    <Button size="lg" variant="outline" onClick={handleRerecord} disabled={stage === 'submitting'}>
                        <RefreshCw className="mr-2" /> Re-record
                    </Button>
                    <Button size="lg" onClick={handleSubmit} disabled={stage === 'submitting'}>
                        {stage === 'submitting' ? (
                            <Loader2 className="mr-2 animate-spin" />
                        ) : (
                            <Send className="mr-2" />
                        )}
                        Submit for Feedback
                    </Button>
                </div>
            </CardContent>
          </>
      )}

    </Card>
  );
}
