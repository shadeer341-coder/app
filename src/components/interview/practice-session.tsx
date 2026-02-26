
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, StopCircle, RefreshCw, Send, AlertTriangle, ArrowRight, PartyPopper, Camera, CheckCircle, Wifi, Mic, Play, Circle } from 'lucide-react';
import { startInterview, submitInterview, saveInterviewAttempt } from '@/app/actions/interview';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from '../ui/scroll-area';


type InterviewQuestion = Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags' | 'read_time_seconds' | 'answer_time_seconds'> & { categoryName: string };

type AttemptData = {
  questionId: number;
  transcript: string;
  snapshots: string[];
};

type PracticeSessionProps = {
  questions: InterviewQuestion[];
  user: User | null;
  initialSessionId?: string;
  initialQuestionIndex?: number;
  initialAttemptData?: AttemptData[];
};

type Stage = 
    | 'introduction' 
    | 'question_ready'
    | 'question_reading'
    | 'question_recording'
    | 'question_review'
    | 'submitting' 
    | 'finished';


const MicrophoneVisualizer = ({ stream }: { stream: MediaStream | null }) => {
    const [volume, setVolume] = useState(0);
    const animationFrameIdRef = useRef<number>();

    useEffect(() => {
        if (!stream || stream.getAudioTracks().length === 0) {
            setVolume(0);
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            return;
        }

        let audioContext: AudioContext;
        let analyser: AnalyserNode;
        let source: MediaStreamAudioSourceNode;

        try {
            audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyser = audioContext.createAnalyser();
            source = audioContext.createMediaStreamSource(stream);
            source.connect(analyser);

            analyser.fftSize = 256;
            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                
                let sum = 0;
                for (let i = 0; i < bufferLength; i++) {
                    sum += dataArray[i];
                }
                const average = sum / bufferLength;

                const normalized = Math.min(average / 140, 1);
                setVolume(normalized);
                animationFrameIdRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();

        } catch (e) {
            console.error('Error setting up audio visualizer:', e);
        }

        return () => {
            if (animationFrameIdRef.current) {
                cancelAnimationFrame(animationFrameIdRef.current);
            }
            if (source) source.disconnect();
            if (audioContext && audioContext.state !== 'closed') {
                audioContext.close().catch(console.error);
            }
        };
    }, [stream]);

    return (
        <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
                className="h-full bg-primary rounded-full transition-[width] duration-75"
                style={{ width: `${volume * 100}%` }}
            />
        </div>
    );
};

const CircularTimer = ({ duration, remaining }: { duration: number; remaining: number }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.max(0, remaining) / Math.max(1, duration);
    const strokeDashoffset = circumference * (1 - progress);

    return (
        <div className="relative w-48 h-48">
            <svg className="w-full h-full" viewBox="0 0 120 120">
                <circle
                    className="text-muted/20"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                />
                <circle
                    className="text-primary"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx="60"
                    cy="60"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                    transform="rotate(-90 60 60)"
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold font-mono">{remaining}</span>
                <span className="text-sm text-muted-foreground -mt-1">seconds left</span>
            </div>
        </div>
    );
};

const InterviewAgenda = ({
  questions,
  currentQuestionIndex,
}: {
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
}) => {
  return (
    <div className="w-full max-w-md flex flex-col justify-center h-full py-8">
        <h2 className="font-headline text-2xl font-bold mb-4 px-3">Interview Agenda</h2>
        <ScrollArea className="h-full -mx-4">
            <ul className="space-y-2 px-4">
                {questions.map((question, index) => {
                const status: 'completed' | 'current' | 'upcoming' =
                    index < currentQuestionIndex
                    ? 'completed'
                    : index === currentQuestionIndex
                    ? 'current'
                    : 'upcoming';
                const isCurrent = status === 'current';

                return (
                    <li
                        key={index}
                        className={cn('p-3 rounded-lg transition-colors', {
                            'bg-primary/10': isCurrent,
                        })}
                        >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 pt-1">
                                {status === 'completed' && (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                )}
                                {status === 'current' && (
                                    <Play className="h-5 w-5 text-primary" />
                                )}
                                {status === 'upcoming' && (
                                    <Circle className="h-5 w-5 text-muted-foreground/50" />
                                )}
                            </div>
                            <div className="flex-1">
                                <p className={cn('font-medium text-lg', {
                                        'text-primary': isCurrent,
                                        'text-muted-foreground line-through': status === 'completed',
                                    })}>
                                    Question {String(index + 1).padStart(2, '0')}
                                </p>
                                <p className={cn('text-sm', {
                                        'text-primary/80': isCurrent,
                                        'text-muted-foreground': status !== 'current',
                                        'line-through': status === 'completed',
                                    })}>
                                    {question.categoryName} • {question.answer_time_seconds || 60}s answer
                                </p>
                            </div>
                        </div>
                    </li>
                );
                })}
            </ul>
        </ScrollArea>
    </div>
  );
};


async function transcribeAudio(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'interview-answer.webm');

    const response = await fetch(`/api/transcribe`, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        let errorMessage = `Transcription failed: ${response.statusText}`;
        if (response.status === 413) {
            errorMessage = "The recording is too large to upload. Please try answering more concisely.";
        } else {
            try {
                const errorBody = await response.text();
                if (errorBody.includes('FUNCTION_PAYLOAD_TOO_LARGE')) {
                     errorMessage = "The recording is too large to process. Please try a shorter answer.";
                } else {
                    try {
                        const errorJson = JSON.parse(errorBody);
                        errorMessage = `Transcription failed: ${errorJson.error || errorBody}`;
                    } catch {
                        errorMessage = `Transcription failed: An unexpected server error occurred.`;
                    }
                }
            } catch {
                // Ignore
            }
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    return result.transcript;
}

export function PracticeSession({ 
    questions, 
    user, 
    initialSessionId, 
    initialQuestionIndex = 0, 
    initialAttemptData = [] 
}: PracticeSessionProps) {
  const [stage, setStage] = useState<Stage>('introduction');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(initialQuestionIndex);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  
  const [videoRecordings, setVideoRecordings] = useState<Record<number, string | null>>({});
  const [attemptData, setAttemptData] = useState<AttemptData[]>(initialAttemptData);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [currentSnapshots, setCurrentSnapshots] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);

  const [cameraCheck, setCameraCheck] = useState<'pending' | 'success' | 'error'>('pending');
  const [micCheck, setMicCheck] = useState<'pending' | 'success' | 'error'>('pending');
  const [internetSpeed, setInternetSpeed] = useState<number | null>(null);
  const [downloadDuration, setDownloadDuration] = useState<number | null>(null);
  const [internetCheckStatus, setInternetCheckStatus] = useState<'pending' | 'running' | 'success' | 'error'>('pending');
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState<string>('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const reviewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const { toast } = useToast();
  const router = useRouter();

  const currentQuestion = questions[currentQuestionIndex];
  
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
     if (videoRef.current) {
        videoRef.current.srcObject = null;
    }
  }, []);

  const getCameraPermission = useCallback(async () => {
    try {
        const audioConstraint = selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true;
        const videoConstraint = selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: audioConstraint
        });
        
        streamRef.current = stream;
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
        
        setHasCameraPermission(true);
        return true;
    } catch (error) {
        console.error('Error accessing media devices:', error);
        setHasCameraPermission(false);
        toast({
            variant: 'destructive',
            title: 'Permission Denied',
            description: 'Please enable camera and microphone permissions in your browser settings.',
        });
        return false;
    }
  }, [selectedAudioDeviceId, selectedVideoDeviceId, toast]);


  const checkInternetSpeed = useCallback(async () => {
    setInternetCheckStatus('running');
    setInternetSpeed(null);
    setDownloadDuration(null);
    try {
        const testFileUrl = 'https://speed.cloudflare.com/__down?bytes=1000000';
        const fileSizeInBytes = 1000000;
        const startTime = new Date().getTime();
        
        const response = await fetch(testFileUrl, { cache: 'no-store' });
         if (!response.ok) {
          throw new Error(`Test file fetch failed with status: ${response.status}`);
        }
        await response.blob();
        
        const endTime = new Date().getTime();
        
        const durationMs = endTime - startTime;
        setDownloadDuration(durationMs);

        if (durationMs < 1) {
            setInternetSpeed(1000);
        } else {
          const duration = durationMs / 1000;
          const bitsLoaded = fileSizeInBytes * 8;
          const speedBps = bitsLoaded / duration;
          const speedMbps = parseFloat((speedBps / 1000 / 1000).toFixed(2));
          setInternetSpeed(speedMbps);
        }
        setInternetCheckStatus('success');

    } catch (error) {
        console.error('Internet speed test failed:', error);
        setInternetCheckStatus('error');
    }
  }, []);


  useEffect(() => {
    if (stage !== 'introduction') {
      if (previewStream) {
        previewStream.getTracks().forEach((track) => track.stop());
        setPreviewStream(null);
      }
      return;
    }
  
    let isCancelled = false;
  
    const setupAndPreview = async () => {
      let tempStreamForPerms: MediaStream | null = null;
      try {
        tempStreamForPerms = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (isCancelled) return;
  
        const audio = devices.filter((d) => d.kind === 'audioinput');
        const video = devices.filter((d) => d.kind === 'videoinput');
        
        setAudioDevices(audio);
        setVideoDevices(video);
  
        setMicCheck(audio.length > 0 ? 'success' : 'error');
        setCameraCheck(video.length > 0 ? 'success' : 'error');
  
        if (!selectedAudioDeviceId && audio.length > 0) setSelectedAudioDeviceId(audio[0].deviceId);
        if (!selectedVideoDeviceId && video.length > 0) setSelectedVideoDeviceId(video[0].deviceId);
  
      } catch (error) {
        if (isCancelled) return;
        setHasCameraPermission(false);
        setCameraCheck('error');
        setMicCheck('error');
      } finally {
        tempStreamForPerms?.getTracks().forEach(track => track.stop());
      }
    };
  
    setupAndPreview();
  
    return () => { isCancelled = true; };
  }, [stage]);


  useEffect(() => {
    let isCancelled = false;
    let currentStream: MediaStream | null = null;
  
    const startPreviewStream = async () => {
      if (stage !== 'introduction' || !selectedAudioDeviceId || !selectedVideoDeviceId) {
        return;
      }
  
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedVideoDeviceId } },
          audio: { deviceId: { exact: selectedAudioDeviceId } }
        });
        if (isCancelled) {
            currentStream.getTracks().forEach(track => track.stop());
            return;
        };
        setPreviewStream(currentStream);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = currentStream;
        }
        setHasCameraPermission(true);
      } catch (error) {
        if (isCancelled) return;
        setHasCameraPermission(false);
        setCameraCheck('error');
      }
    }
  
    startPreviewStream();
  
    return () => {
      isCancelled = true;
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
      setPreviewStream(null);
    }
  }, [stage, selectedAudioDeviceId, selectedVideoDeviceId]);


  useEffect(() => {
    if (stage === 'introduction' && internetCheckStatus === 'pending') {
      checkInternetSpeed();
    }
  }, [stage, internetCheckStatus, checkInternetSpeed]);

  useEffect(() => {
    const isInterviewInProgress = !['introduction', 'finished'].includes(stage);

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = 'Are you sure you want to leave? Your current question progress will be lost, but you can resume from where you left off later.';
    };

    if (isInterviewInProgress) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [stage]);


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
    if (!permissionGranted || !streamRef.current) return;

    setCurrentSnapshots([]);
    recordedChunksRef.current = [];
    audioChunksRef.current = [];
  
    if (currentQuestion?.categoryName === 'Pre-Interview Checks' && currentQuestion?.text.includes('passport')) {
      setTimeout(() => {
        const snapshot1 = captureSnapshot();
        if (snapshot1) setCurrentSnapshots(prev => [...prev, snapshot1]);
      }, 1000);
      setTimeout(() => {
        const snapshot2 = captureSnapshot();
        if (snapshot2) setCurrentSnapshots(prev => [...prev, snapshot2]);
      }, 4000);
    }
  
    const videoOptions = {
        mimeType: 'video/webm;codecs=vp8,opus',
        videoBitsPerSecond: 300000,
        audioBitsPerSecond: 48000,
    };
    
    const audioOptions = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 32000,
    };

    try {
        if (MediaRecorder.isTypeSupported(videoOptions.mimeType)) {
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, videoOptions);
        } else {
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
        }
    } catch (e) {
        mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
    }
  
    mediaRecorderRef.current.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunksRef.current.push(event.data);
      }
    };
  
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      setVideoRecordings(prev => ({...prev, [currentQuestionIndex]: url}));
      setStage('question_review');
      stopCamera();
    };
    
    try {
      const audioStream = new MediaStream(streamRef.current.getAudioTracks());
      if (MediaRecorder.isTypeSupported(audioOptions.mimeType)) {
          audioRecorderRef.current = new MediaRecorder(audioStream, audioOptions);
      } else {
          audioRecorderRef.current = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
      }
    } catch(e) {
      console.error("Could not create audio recorder", e);
      return;
    }

    audioRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
        }
    };

    audioRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setCurrentAudioBlob(audioBlob);
    };

    mediaRecorderRef.current.start();
    audioRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (audioRecorderRef.current && audioRecorderRef.current.state === 'recording') {
        audioRecorderRef.current.stop();
    }
  };

  useEffect(() => {
    let timerId: NodeJS.Timeout;
    if (stage === 'question_reading') {
        const readTime = currentQuestion.read_time_seconds || 15;
        setCountdown(readTime);
        timerId = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    setStage('question_recording');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    } else if (stage === 'question_recording') {
        startRecording();
        const answerTime = currentQuestion.answer_time_seconds || 60;
        setCountdown(answerTime);
        timerId = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    clearInterval(timerId);
                    stopRecording();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timerId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, currentQuestionIndex]);

  const processAndAdvance = async () => {
    if (!currentAudioBlob || !sessionId) return;
    
    setIsTranscribing(true);
    try {
        const transcript = await transcribeAudio(currentAudioBlob);
        
        const newAttempt: AttemptData = {
          questionId: currentQuestion.id,
          transcript: transcript,
          snapshots: currentSnapshots,
        };

        // Save this attempt incrementally to the database
        await saveInterviewAttempt(sessionId, newAttempt);

        const newAttemptData = [...attemptData, newAttempt];
        setAttemptData(newAttemptData);
        setCurrentAudioBlob(null);
        setCurrentSnapshots([]);
        
        const isFinalQuestion = currentQuestionIndex === questions.length - 1;
        
        if (isFinalQuestion) {
            setStage('submitting');
            await handleSubmit();
        } else {
            setCurrentQuestionIndex(prev => prev + 1);
            setStage('question_ready');
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


  const handleSubmit = async () => {
      if (!sessionId) return;

      setIsSubmitting(true);
      toast({
          title: "Submitting Interview...",
      });

      try {
        const result = await submitInterview(sessionId);

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
        setStage('question_review');
      } finally {
        setIsSubmitting(false);
      }
  };
  
  const handleStartInterview = async () => {
    const result = await startInterview();

    if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setStage('question_ready');
        getCameraPermission();
        if (result.resumed) {
            toast({ title: "Welcome back!", description: "Continuing your previous session." });
        }
    } else {
        toast({
            variant: "destructive",
            title: "Could Not Start Interview",
            description: result.message,
        });
    }
  }


  useEffect(() => {
    return () => {
        stopCamera();
        if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
            audioRecorderRef.current.stop();
        }
        Object.values(videoRecordings).forEach(url => {
            if (url) URL.revokeObjectURL(url);
        });
    }
  }, [stopCamera, videoRecordings, previewStream]);

  if (questions.length === 0) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-xl">
                <CardHeader>
                    <CardTitle>No Questions Available</CardTitle>
                    <CardDescription>There are no questions configured for your interview session.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Please contact an administrator to set up the interview questions.</p>
                    <Button onClick={() => router.push('/dashboard')} className="mt-4">Back to Dashboard</Button>
                </CardContent>
            </Card>
        </div>
    )
  }

  const renderLeftPaneContent = () => {
    const isFinalQuestion = currentQuestionIndex === questions.length - 1;

    if (stage === 'question_reading') {
        return (
            <div className="w-full max-w-md flex flex-col items-center justify-center h-full py-8 text-center">
                <CircularTimer
                    duration={currentQuestion.read_time_seconds || 15}
                    remaining={countdown}
                />
            </div>
        );
    }
    
    if (stage === 'question_recording') {
        return (
             <div className="w-full h-full flex flex-col justify-center items-center text-left p-8">
                <p className="text-3xl font-semibold flex-1 flex items-center">{currentQuestion.text}</p>
            </div>
        );
    }
    
    if (stage === 'question_review') {
        return (
            <div className="w-full max-w-md flex flex-col justify-center h-full py-8 text-left">
                <div className="w-full space-y-4">
                    <p className="text-2xl font-semibold mb-8">{currentQuestion.text}</p>
                    <Button size="lg" onClick={processAndAdvance} disabled={isTranscribing} className="w-full">
                        {isTranscribing && <Loader2 className="mr-2 animate-spin" />}
                        {!isTranscribing && (isFinalQuestion ? <Send className="mr-2"/> : <ArrowRight className="mr-2" />)}
                        {isFinalQuestion ? 'Finish & Submit' : 'Next Question'}
                    </Button>
                </div>
            </div>
        )
    }

    if (['introduction', 'question_ready', 'submitting'].includes(stage)) {
        return (
            <InterviewAgenda
                questions={questions}
                currentQuestionIndex={currentQuestionIndex}
            />
        );
    }
    
    return null;
}

  const renderVideo = () => {
    const showPreview = stage === 'introduction';
    const showReview = stage === 'question_review' && videoRecordings[currentQuestionIndex];
    const showLive = !showPreview && !showReview;

    return (
        <div className="relative aspect-video w-full max-w-3xl rounded-lg overflow-hidden border-2 border-white/20 shadow-2xl bg-black">
            {showPreview && <video ref={previewVideoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
            {showReview && <video ref={reviewVideoRef} src={videoRecordings[currentQuestionIndex]!} className="w-full h-full object-cover" controls controlsList="nodownload" playsInline />}
            {showLive && <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />}
            
            {stage === 'question_ready' && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 text-center p-6 bg-black/70 text-white">
                    <p className="text-lg text-white/80">Video Response • {currentQuestion.answer_time_seconds || 60} seconds</p>
                    <h3 className="text-3xl font-bold font-headline">You will have {currentQuestion.read_time_seconds || 15} seconds to prepare your answer.</h3>
                    <Button size="lg" onClick={() => setStage('question_reading')}>
                        Start
                    </Button>
                </div>
            )}

            {stage === 'question_reading' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8 bg-black/80 text-white text-center">
                    <p className="text-3xl font-bold font-headline mb-4 flex-1 flex items-center">{currentQuestion.text}</p>
                </div>
            )}
            
            {stage === 'question_recording' && (
                <>
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-mono">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                        <span>REC: {String(countdown).padStart(2, '0')}s</span>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-end gap-8 p-6 text-center bg-black/20 pointer-events-none">
                        <div className="absolute bottom-8 pointer-events-auto">
                            <Button onClick={stopRecording} variant="destructive" size="lg">
                                <StopCircle className="mr-2" /> Stop Recording
                            </Button>
                        </div>
                    </div>
                </>
            )}

            {hasCameraPermission === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center">
                    <AlertTriangle className="w-12 h-12 mb-4" />
                    <h3 className="text-xl font-bold">Camera Access Required</h3>
                    <p>Please allow camera and microphone access to record.</p>
                </div>
            )}
        </div>
    )
  }

  const renderIntroduction = () => {
    return (
        <Card className="w-full max-w-2xl">
            <CardHeader className="text-center">
                <CardTitle className="font-headline text-3xl md:text-4xl">Your Interview is Ready</CardTitle>
                <CardDescription>
                    {sessionId ? "You have a session in progress. Click below to resume." : "First, let's check your setup. You'll be asked 4 questions."}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <ul className="space-y-3">
                    <li className="p-3 rounded-lg bg-background space-y-3">
                        <div className="flex items-center justify-between flex-wrap">
                            <div className="flex items-center gap-3">
                                <Mic className="w-5 h-5 text-muted-foreground" />
                                <span className="font-medium">Microphone</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {micCheck === 'pending' && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                                {micCheck === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                {micCheck === 'error' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                            </div>
                        </div>
                        {micCheck === 'success' && (
                            <div className='space-y-3'>
                                <div className="pt-2">
                                    <MicrophoneVisualizer stream={previewStream} />
                                </div>
                                <Select value={selectedAudioDeviceId} onValueChange={setSelectedAudioDeviceId} disabled={audioDevices.length <= 1}>
                                    <SelectTrigger><SelectValue placeholder="Select microphone" /></SelectTrigger>
                                    <SelectContent>
                                        {audioDevices.map(device => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </li>
                    <li className="flex items-center justify-between p-3 rounded-lg bg-background">
                        <div className="flex items-center gap-3">
                            <Camera className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">Camera</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {cameraCheck === 'pending' && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                            {cameraCheck === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {cameraCheck === 'error' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                        </div>
                    </li>
                        {cameraCheck === 'success' && (
                        <li className="p-3 rounded-lg bg-background">
                            <Select value={selectedVideoDeviceId} onValueChange={setSelectedVideoDeviceId} disabled={videoDevices.length <= 1}>
                                <SelectTrigger><SelectValue placeholder="Select camera" /></SelectTrigger>
                                <SelectContent>
                                    {videoDevices.map(device => <SelectItem key={device.deviceId} value={device.deviceId}>{device.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </li>
                        )}
                    <li className="flex items-center justify-between p-3 rounded-lg bg-background">
                        <div className="flex items-center gap-3">
                            <Wifi className="w-5 h-5 text-muted-foreground" />
                            <span className="font-medium">Internet Connection</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {(internetCheckStatus === 'pending' || internetCheckStatus === 'running') && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                            {internetCheckStatus === 'success' && (
                                <>
                                    {internetSpeed !== null && <span className="text-sm font-bold text-green-500">{internetSpeed} Mbps</span>}
                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                </>
                            )}
                            {internetCheckStatus === 'error' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                            
                            {(internetCheckStatus === 'success' || internetCheckStatus === 'error') && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={checkInternetSpeed}>
                                    <RefreshCw className="w-4 h-4"/><span className="sr-only">Retry</span>
                                </Button>
                            )}
                        </div>
                    </li>
                </ul>
            </CardContent>
            <CardFooter className="flex-col items-center gap-4">
                <Button size="lg" onClick={handleStartInterview} disabled={cameraCheck !== 'success' || micCheck !== 'success' || internetCheckStatus !== 'success'}>
                    {sessionId ? "Resume Interview" : "Start Interview"}
                </Button>
                {(cameraCheck !== 'success' || micCheck !== 'success' || internetCheckStatus !== 'success') && (
                    <p className="text-xs text-muted-foreground">Please resolve the issues above to begin.</p>
                )}
            </CardFooter>
        </Card>
    )
  }

  const renderMainContent = () => {
    if (stage === 'introduction') {
        return (
            <div className="w-full md:w-[40%] flex flex-col items-center justify-center p-4 sm:p-8 bg-secondary">
                {renderIntroduction()}
            </div>
        )
    }

    if (stage === 'submitting') {
      return (
            <div className="w-full md:w-[40%] flex flex-col items-center justify-center p-4 sm:p-8 bg-secondary">
                <Card className="w-full max-w-md text-center">
                    <CardHeader className="items-center">
                        <PartyPopper className="w-16 h-16 text-primary" />
                        <CardTitle className="mt-4 text-2xl">Finishing up...</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin" />
                        <p>Submitting your interview for analysis.</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="w-full md:w-[40%] flex flex-col items-center justify-center p-4 sm:p-8 bg-secondary">
            {renderLeftPaneContent()}
        </div>
    )
  }


  return (
    <div className="flex min-h-screen w-full bg-background font-sans flex-col md:flex-row">
      {/* Left Pane */}
      {renderMainContent()}

      {/* Right Pane */}
      <div 
        className="w-full md:w-[60%] relative bg-cover bg-center min-h-96 md:min-h-screen" 
        style={{ backgroundImage: 'url(/cas-cam.webp)' }}
      >
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center p-8">
            {renderVideo()}
        </div>
      </div>
    </div>
  );
}
