
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Video, StopCircle, RefreshCw, Send, AlertTriangle, ArrowRight, PartyPopper, Camera } from 'lucide-react';
import { submitInterview } from '@/app/actions/interview';

type InterviewQuestion = Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags'> & { categoryName: string };

type PracticeSessionProps = {
  questions: InterviewQuestion[];
  user: User | null;
};

type Stage = 'introduction' | 'answering' | 'recording' | 'reviewing' | 'submitting' | 'finished';

type AttemptData = {
  questionId: number;
  transcript: string;
  snapshots: string[];
};

async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview-answer.webm');
    
    const response = await fetch(`/api/transcribe`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(`Transcription failed: ${errorBody.error || response.statusText}`);
    }

    const result = await response.json();
    return result.transcript;
}

export function PracticeSession({ questions, user }: PracticeSessionProps) {
  const [stage, setStage] = useState<Stage>('introduction');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  
  const [videoRecordings, setVideoRecordings] = useState<Record<number, string | null>>({});
  const [attemptData, setAttemptData] = useState<AttemptData[]>([]);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [currentSnapshots, setCurrentSnapshots] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);


  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const router = useRouter();

  const currentQuestion = questions[currentQuestionIndex];
  
  const getCameraPermission = useCallback(async () => {
    if (hasCameraPermission === true && videoRef.current?.srcObject) {
        return true;
    }

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

  const captureSnapshot = useCallback((): string => {
    if (videoRef.current && videoRef.current.readyState >= 2) {
        const canvas = document.createElement('canvas');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg');
        }
    }
    return '';
  }, []);


  const startRecording = async () => {
    const permissionGranted = await getCameraPermission();
    if (!permissionGranted || !videoRef.current?.srcObject) return;
  
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  
    setIsRecording(true);
    setStage('recording');
    setCurrentSnapshots([]);
    recordedChunksRef.current = [];
  
    // Only take snapshots for the first question
    if (currentQuestionIndex === 0) {
      // Capture 2 snapshots after a delay to ensure camera is ready
      setTimeout(() => {
        const snapshot1 = captureSnapshot();
        if (snapshot1) setCurrentSnapshots(prev => [...prev, snapshot1]);
      }, 1000); // 1 second in
  
      setTimeout(() => {
        const snapshot2 = captureSnapshot();
        if (snapshot2) setCurrentSnapshots(prev => [...prev, snapshot2]);
      }, 4000); // 4 seconds in
    }
  
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
      setCurrentAudioBlob(blob);
  
      setIsRecording(false);
      setStage('reviewing');
      
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRerecord = () => {
    if (videoRecordings[currentQuestionIndex]) {
        URL.revokeObjectURL(videoRecordings[currentQuestionIndex]!);
    }
    setVideoRecordings(prev => ({...prev, [currentQuestionIndex]: null}));
    setCurrentAudioBlob(null);
    setCurrentSnapshots([]);
    recordedChunksRef.current = [];
    setStage('answering');
    getCameraPermission();
  };
  
  const processAndAdvance = async () => {
    if (!currentAudioBlob) return;
    
    setIsTranscribing(true);
    try {
        const transcript = await transcribeAudio(currentAudioBlob);
        
        const newAttempt: AttemptData = {
          questionId: currentQuestion.id,
          transcript: transcript,
          snapshots: currentSnapshots,
        };

        const newAttemptData = [...attemptData, newAttempt];
        setAttemptData(newAttemptData);
        setCurrentAudioBlob(null);
        setCurrentSnapshots([]);
        
        const isFinalQuestion = currentQuestionIndex === questions.length - 1;
        
        if (isFinalQuestion) {
            setStage('submitting');
            await handleSubmit(newAttemptData);
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
            setStage('answering');
            getCameraPermission();
        }
    } catch (error: any) {
        console.error("Transcription failed:", error);
        toast({
            variant: "destructive",
            title: "Transcription Failed",
            description: error.message || "Could not process your audio. Please try again.",
        });
    } finally {
        setIsTranscribing(false);
    }
  }


  const handleSubmit = async (finalInterviewData: AttemptData[]) => {
      setIsSubmitting(true);
      toast({
          title: "Submitting Interview...",
          description: "Your answers are being analyzed. This may take a moment.",
      });

      try {
        if (finalInterviewData.length === 0) {
            throw new Error("No answers were recorded.");
        }
        
        const result = await submitInterview(finalInterviewData);

        if (result.success && result.sessionId) {
            toast({
                title: "Submission Successful!",
                description: "You will be redirected to your feedback.",
            });
            router.push(`/dashboard/interviews/${result.sessionId}`);
        } else {
            throw new Error(result.message);
        }
      } catch (error: any) {
        console.error("Submission failed:", error);
        toast({
            variant: "destructive",
            title: "Submission Failed",
            description: error.message || "Could not submit your interview for analysis.",
        });
        setStage('reviewing'); // Go back to review stage on failure
      } finally {
        setIsSubmitting(false);
      }
  };
  
  const handleStartInterview = () => {
    setStage('answering');
    getCameraPermission();
  }

  useEffect(() => {
    if (stage === 'answering' && currentQuestion?.audio_url && audioRef.current) {
        audioRef.current.src = currentQuestion.audio_url;
        audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
    }
  }, [currentQuestion, stage]);


  useEffect(() => {
    return () => {
        Object.values(videoRecordings).forEach(url => {
            if (url) URL.revokeObjectURL(url);
        });
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
        }
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
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (stage === 'submitting') {
    return (
        <Card>
            <CardHeader className="items-center text-center">
                <PartyPopper className="w-16 h-16 text-primary" />
                <CardTitle className="mt-4">Finishing up...</CardTitle>
                <CardDescription>Your interview is being submitted for AI analysis.</CardDescription>
            </CardHeader>
            <CardContent className="text-center flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin" />
                <p>Please wait, this may take a moment.</p>
            </CardContent>
        </Card>
    )
  }

  return (
    <Card>
        <audio ref={audioRef} />
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
                <div className="text-center p-8 border rounded-lg bg-secondary">
                    <p className="text-2xl font-bold font-headline">{currentQuestion?.text}</p>
                </div>

                <div className="relative aspect-video w-full rounded-md border bg-slate-900 overflow-hidden">
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center">
                            <AlertTriangle className="w-12 h-12 mb-4" />
                            <h3 className="text-xl font-bold">Camera Access Required</h3>
                            <p>Please allow camera and microphone access to record.</p>
                        </div>
                    )}
                    {stage === 'recording' && (
                        <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1 rounded-full">
                            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                            <span>REC</span>
                        </div>
                    )}
                </div>

                <div className="flex justify-center">
                    {stage === 'answering' && (
                        <Button size="lg" onClick={startRecording} disabled={hasCameraPermission !== true}>
                            <Camera className="mr-2" /> Start Recording
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
                <CardDescription>You can re-record or proceed. Note: this is a silent preview.</CardDescription>
                <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="aspect-video w-full rounded-md border bg-black overflow-hidden">
                    <video src={videoRecordings[currentQuestionIndex]!} className="w-full h-full" playsInline autoPlay loop muted />
                </div>
                <div className="flex justify-center gap-4">
                    <Button size="lg" variant="outline" onClick={handleRerecord} disabled={isTranscribing}>
                        <RefreshCw className="mr-2" /> Re-record
                    </Button>
                    <Button size="lg" onClick={processAndAdvance} disabled={isTranscribing}>
                        {isTranscribing && <Loader2 className="mr-2 animate-spin" />}
                        {!isTranscribing && (isLastQuestion ? <Send className="mr-2"/> : <ArrowRight className="mr-2" />)}
                        {isLastQuestion ? 'Finish & Submit' : 'Next Question'}
                    </Button>
                </div>
            </CardContent>
          </>
      )}
    </Card>
  );
}
