
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Video, StopCircle, RefreshCw, Send, AlertTriangle, ArrowRight, PartyPopper } from 'lucide-react';

type InterviewQuestion = Pick<Question, 'id' | 'text' | 'category_id'> & { categoryName: string };

type PracticeSessionProps = {
  questions: InterviewQuestion[];
  user: User | null;
};

type Stage = 'introduction' | 'answering' | 'recording' | 'reviewing' | 'submitting' | 'finished';

export function PracticeSession({ questions, user }: PracticeSessionProps) {
  const [stage, setStage] = useState<Stage>('introduction');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  // Store recordings for each question
  const [videoRecordings, setVideoRecordings] = useState<Record<number, string | null>>({});

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const router = useRouter();

  const currentQuestion = questions[currentQuestionIndex];
  
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
    recordedChunksRef.current = [];

    const stream = videoRef.current.srcObject as MediaStream;
    mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'video/webm' });

    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoRecordings(prev => ({...prev, [currentQuestionIndex]: url}));
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
    setVideoRecordings(prev => ({...prev, [currentQuestionIndex]: null}));
    recordedChunksRef.current = [];
    setStage('answering');
  };
  
  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setStage('answering');
    } else {
      setStage('finished');
    }
  };

  const handleSubmit = async () => {
      setStage('submitting');
      toast({
          title: "Submitting...",
          description: "Your interview is being submitted for analysis. Please wait.",
      });

      // This is where you would convert blobs to data URIs and send to the AI flow
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
  
  const handleStartInterview = () => {
    setStage('answering');
    getCameraPermission();
  }

  useEffect(() => {
    // Clean up blob URLs on unmount
    return () => {
        Object.values(videoRecordings).forEach(url => {
            if (url) URL.revokeObjectURL(url);
        });
    }
  }, [videoRecordings]);

  if (questions.length === 0) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>No Questions Available</CardTitle>
                <CardDescription>There are no questions configured for your interview session.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>Please contact an administrator to set up the interview questions.</p>
                <Button onClick={() => router.push('/dashboard')} className="mt-4">Back to Dashboard</Button>
            </CardContent>
        </Card>
    )
  }

  const progressValue = (currentQuestionIndex / questions.length) * 100;

  return (
    <Card>
        {stage === 'introduction' && (
             <>
                <CardHeader>
                    <CardTitle>Your Interview is Ready</CardTitle>
                    <CardDescription>You will be asked {questions.length} questions in this session. Good luck!</CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <p className="text-lg">Click the button below to begin.</p>
                </CardContent>
                <CardFooter className="justify-center">
                    <Button size="lg" onClick={handleStartInterview}>
                        Start Interview
                    </Button>
                </CardFooter>
            </>
        )}
      
      {(stage === 'answering' || stage === 'recording') && (
        <>
            <CardHeader>
                <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                <CardDescription>Category: <strong>{currentQuestion?.categoryName}</strong></CardDescription>
                <Progress value={progressValue} className="mt-2" />
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
                    {stage === 'answering' && (
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
      
      {stage === 'reviewing' && videoRecordings[currentQuestionIndex] && (
          <>
            <CardHeader>
                <CardTitle>Review Your Answer for Question {currentQuestionIndex + 1}</CardTitle>
                <CardDescription>Watch your performance. You can re-record or proceed to the next question.</CardDescription>
                <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="aspect-video w-full rounded-md border bg-secondary overflow-hidden">
                    <video src={videoRecordings[currentQuestionIndex]!} className="w-full h-full" controls playsInline autoPlay />
                </div>
                <div className="flex justify-center gap-4">
                    <Button size="lg" variant="outline" onClick={handleRerecord}>
                        <RefreshCw className="mr-2" /> Re-record
                    </Button>
                    <Button size="lg" onClick={handleNextQuestion}>
                        {currentQuestionIndex < questions.length - 1 ? 'Next Question' : 'Finish Interview'}
                        <ArrowRight className="ml-2" />
                    </Button>
                </div>
            </CardContent>
          </>
      )}

      {stage === 'finished' && (
        <>
            <CardHeader className="items-center text-center">
                <PartyPopper className="w-16 h-16 text-primary" />
                <CardTitle className="mt-4">Interview Complete!</CardTitle>
                <CardDescription>You have answered all {questions.length} questions.</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
                <p>You can now submit your interview for AI-powered feedback.</p>
            </CardContent>
             <CardFooter className="justify-center">
                <Button size="lg" onClick={handleSubmit} disabled={stage === 'submitting'}>
                    {stage === 'submitting' ? (
                        <Loader2 className="mr-2 animate-spin" />
                    ) : (
                        <Send className="mr-2" />
                    )}
                    Submit for Feedback
                </Button>
            </CardFooter>
        </>
      )}

    </Card>
  );
}
