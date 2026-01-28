
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Video, StopCircle, RefreshCw, Send, AlertTriangle, ArrowRight, PartyPopper, Camera, CheckCircle, Wifi, Mic, Play } from 'lucide-react';
import { submitInterview } from '@/app/actions/interview';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


type InterviewQuestion = Pick<Question, 'id' | 'text' | 'category_id' | 'audio_url' | 'tags' | 'read_time_seconds' | 'answer_time_seconds'> & { categoryName: string };

type PracticeSessionProps = {
  questions: InterviewQuestion[];
  user: User | null;
};

type Stage = 
    | 'introduction' 
    | 'question_ready'
    | 'question_reading'
    | 'question_recording'
    | 'question_review'
    | 'submitting' 
    | 'finished';

type AttemptData = {
  questionId: number;
  transcript: string;
  snapshots: string[];
};

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
    // Ensure progress doesn't go below 0
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
                    transform="rotate(-90 60 60)"
                    style={{ transition: 'stroke-dashoffset 0.5s linear' }}
                />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold font-mono">{remaining}</span>
                <span className="text-sm text-muted-foreground -mt-1">seconds left</span>
            </div>
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
  
  const [videoRecordings, setVideoRecordings] = useState<Record<number, string | null>>({});
  const [attemptData, setAttemptData] = useState<AttemptData[]>([]);
  const [currentAudioBlob, setCurrentAudioBlob] = useState<Blob | null>(null);
  const [currentSnapshots, setCurrentSnapshots] = useState<string[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(0);

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

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

  const getCameraPermission = useCallback(async (isInitial = false) => {
    try {
        const audioConstraint = selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true;
        const videoConstraint = selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true;

        const stream = await navigator.mediaDevices.getUserMedia({
            video: videoConstraint,
            audio: audioConstraint
        });
        
        if (isInitial) {
            setPreviewStream(stream);
            if (previewVideoRef.current) {
                previewVideoRef.current.srcObject = stream;
            }
        } else {
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
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

        if (durationMs < 1) { // Avoid division by zero
            setInternetSpeed(1000); // Assume very fast if it's too quick to measure
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
        setInternetSpeed(null);
        setDownloadDuration(null);
        setInternetCheckStatus('error');
    }
  }, []);


  useEffect(() => {
    if (stage !== 'introduction') {
        if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
            setPreviewStream(null);
        }
        return;
    }

    let isCancelled = false;
    
    const setupDevices = async () => {
        try {
            // First, request permissions to ensure we get device labels.
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            if (isCancelled) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            const audio = devices.filter(d => d.kind === 'audioinput');
            const video = devices.filter(d => d.kind === 'videoinput');
            setAudioDevices(audio);
            setVideoDevices(video);
            
            if (audio.length > 0) {
                if (!selectedAudioDeviceId) setSelectedAudioDeviceId(audio[0].deviceId);
                setMicCheck('success');
            } else {
                setMicCheck('error');
            }
            
            if (video.length > 0) {
                if (!selectedVideoDeviceId) setSelectedVideoDeviceId(video[0].deviceId);
                setCameraCheck('success');
            } else {
                setCameraCheck('error');
            }
            
            stream.getTracks().forEach(track => track.stop()); // Stop the initial permission stream
        } catch (error) {
            if (isCancelled) return;
            console.error('Permission or device setup failed:', error);
            setHasCameraPermission(false);
            setCameraCheck('error');
            setMicCheck('error');
        }
    };

    setupDevices();
    
    if (internetCheckStatus === 'pending') {
        checkInternetSpeed();
    }

    return () => {
        isCancelled = true;
         if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
        }
    };
}, [stage, internetCheckStatus, checkInternetSpeed]);


useEffect(() => {
    if (stage === 'introduction' && cameraCheck === 'success' && micCheck === 'success') {
      getCameraPermission(true);
    }
    
    // Cleanup stream when device selection changes
    return () => {
        if (previewStream) {
            previewStream.getTracks().forEach(track => track.stop());
            setPreviewStream(null);
        }
    }
}, [stage, cameraCheck, micCheck, selectedAudioDeviceId, selectedVideoDeviceId, getCameraPermission]);


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
  
    // Only take snapshots for the "Pre-Interview Checks" ID question
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
  
    mediaRecorderRef.current = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
  
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
  
      setStage('question_review');
      stopCamera();
    };
  
    mediaRecorderRef.current.start();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
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
  }, [stage, currentQuestionIndex, hasCameraPermission]);

  const handleRerecord = () => {
    if (videoRecordings[currentQuestionIndex]) {
        URL.revokeObjectURL(videoRecordings[currentQuestionIndex]!);
    }
    setVideoRecordings(prev => ({...prev, [currentQuestionIndex]: null}));
    setCurrentAudioBlob(null);
    setCurrentSnapshots([]);
    recordedChunksRef.current = [];
    setStage('question_ready');
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
        setStage('question_review'); // Go back to review stage on failure
      } finally {
        setIsSubmitting(false);
      }
  };
  
  const handleStartInterview = () => {
    setStage('question_ready');
    if (previewStream) {
        previewStream.getTracks().forEach(track => track.stop());
        setPreviewStream(null);
    }
    getCameraPermission();
  }


  useEffect(() => {
    return () => {
        stopCamera();
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        Object.values(videoRecordings).forEach(url => {
            if (url) URL.revokeObjectURL(url);
        });
    }
  }, [stopCamera, videoRecordings]);

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

  const progressValue = (currentQuestionIndex / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  if (stage === 'submitting') {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Card className="max-w-xl">
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
        </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen w-full">
        <Card className="w-full max-w-7xl h-full max-h-[calc(100vh-2rem)] flex flex-col">
            {stage === 'introduction' && (
                <>
                    <CardHeader className="text-center">
                        <CardTitle className="font-headline text-3xl md:text-4xl">Your Interview is Ready</CardTitle>
                        <CardDescription>First, let's check your setup. You'll be asked {questions.length} questions.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-start overflow-y-auto p-6">
                        {/* Left Column */}
                        <div className="space-y-4">
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
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select microphone" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {audioDevices.map(device => (
                                                        <SelectItem key={device.deviceId} value={device.deviceId}>{device.label}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                </li>
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
                                                {downloadDuration !== null && <span className="text-xs text-muted-foreground">({downloadDuration}ms)</span>}
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                            </>
                                        )}
                                        {internetCheckStatus === 'error' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                                        
                                        {(internetCheckStatus === 'success' || internetCheckStatus === 'error') && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={checkInternetSpeed}>
                                                <RefreshCw className="w-4 h-4"/>
                                                <span className="sr-only">Retry</span>
                                            </Button>
                                        )}
                                    </div>
                                </li>
                            </ul>
                            {cameraCheck === 'error' && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Camera Permission Denied</AlertTitle>
                                    <AlertDescription>
                                        Please allow camera access in your browser settings to proceed.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {micCheck === 'error' && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Microphone Permission Denied</AlertTitle>
                                    <AlertDescription>
                                        Please allow microphone access in your browser settings to proceed.
                                    </AlertDescription>
                                </Alert>
                            )}
                            {internetCheckStatus === 'error' && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Connection Unstable</AlertTitle>
                                    <AlertDescription>
                                        We could not verify your internet speed. A stable connection is recommended.
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                        {/* Right Column */}
                         <div className="space-y-4">
                            <div className="p-3 rounded-lg bg-background space-y-3">
                                <div className="flex items-center justify-between flex-wrap">
                                    <div className="flex items-center gap-3">
                                        <Camera className="w-5 h-5 text-muted-foreground" />
                                        <span className="font-medium">Camera</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {cameraCheck === 'pending' && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                                        {cameraCheck === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                                        {cameraCheck === 'error' && <AlertTriangle className="w-5 h-5 text-destructive" />}
                                    </div>
                                </div>
                                 {cameraCheck === 'success' && (
                                    <div className='space-y-3'>
                                        <div className="relative w-full aspect-video rounded-md border bg-slate-900 overflow-hidden">
                                            <video ref={previewVideoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                                        </div>
                                        <Select value={selectedVideoDeviceId} onValueChange={setSelectedVideoDeviceId} disabled={videoDevices.length <= 1}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select camera" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {videoDevices.map(device => (
                                                    <SelectItem key={device.deviceId} value={device.deviceId}>{device.label}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex-col items-center gap-4 pt-6 border-t">
                        <Button 
                            size="lg" 
                            onClick={handleStartInterview}
                            disabled={cameraCheck !== 'success' || micCheck !== 'success' || internetCheckStatus !== 'success'}
                        >
                            Start Interview
                        </Button>
                        {(cameraCheck !== 'success' || micCheck !== 'success' || internetCheckStatus !== 'success') && (
                            <p className="text-xs text-muted-foreground">Please resolve the issues above to begin.</p>
                        )}
                    </CardFooter>
                </>
            )}
        
        {(stage === 'question_ready' || stage === 'question_reading' || stage === 'question_recording') && (
            <CardContent className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-6">
                {/* Left column */}
                <div className="space-y-6 flex flex-col h-full justify-between">
                    <div className="space-y-2">
                        <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                        <CardDescription>Category: <strong>{currentQuestion?.categoryName}</strong></CardDescription>
                        <Progress value={progressValue} className="mt-2" />
                    </div>
                    <div className={cn("text-center p-6 border rounded-lg bg-secondary flex-grow flex flex-col items-center justify-center")}>
                         {stage === 'question_reading' && (
                            <div className="flex flex-col items-center gap-4">
                                <h3 className="text-xl font-semibold">Time to Read</h3>
                                <CircularTimer
                                    duration={currentQuestion.read_time_seconds || 15}
                                    remaining={countdown}
                                />
                            </div>
                        )}
                        {stage === 'question_recording' && (
                           <div className="flex flex-col items-center justify-center h-full text-center">
                                <p className="text-2xl font-bold font-headline">{currentQuestion?.text}</p>
                           </div>
                        )}
                        {(stage === 'question_ready') && (
                             <div className="flex flex-col items-center gap-6 text-center">
                                <div className="bg-primary/10 p-4 rounded-full">
                                    <Play className="w-12 h-12 text-primary" />
                                </div>
                                <h3 className="text-2xl font-bold">Ready for the next question?</h3>
                                <p className="text-muted-foreground">
                                    You will have {currentQuestion.read_time_seconds || 15} seconds to read the question.
                                </p>
                                <Button size="lg" onClick={() => setStage('question_reading')}>
                                    <Play className="mr-2" />
                                    Start Question
                                </Button>
                            </div>
                        )}
                    </div>
                     <div/>
                </div>

                {/* Right column */}
                <div className="space-y-4 h-full flex flex-col justify-center">
                    <div className="relative aspect-video w-full rounded-md border bg-slate-900 overflow-hidden">
                        <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                        {hasCameraPermission === false && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white p-4 text-center">
                                <AlertTriangle className="w-12 h-12 mb-4" />
                                <h3 className="text-xl font-bold">Camera Access Required</h3>
                                <p>Please allow camera and microphone access to record.</p>
                            </div>
                        )}
                        
                        {stage === 'question_ready' && (
                             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white p-4 text-center">
                                <h3 className="text-2xl font-bold">Get Ready</h3>
                                <p className="mt-2 text-lg">You will have <strong>{currentQuestion.read_time_seconds || 15} seconds</strong> to read the question.</p>
                                <p className="text-lg">You will have <strong>{currentQuestion.answer_time_seconds || 60} seconds</strong> to answer.</p>
                            </div>
                        )}

                        {stage === 'question_reading' && (
                            <div className="absolute inset-0 flex flex-col justify-center bg-black/70 text-white p-4">
                                <div className="flex-grow flex items-center justify-center">
                                    <p className="text-2xl font-bold text-center font-headline">{currentQuestion.text}</p>
                                </div>
                            </div>
                        )}
                        
                        {stage === 'question_recording' && (
                            <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/50 text-white px-3 py-1.5 rounded-full text-sm font-mono">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></div>
                                <span>REC</span>
                                <span className="w-px h-4 bg-white/30"></span>
                                <span>{countdown}s</span>
                            </div>
                        )}
                    </div>
                     {stage === 'question_recording' && (
                        <div className="flex justify-center">
                            <Button onClick={stopRecording} variant="outline">
                                <StopCircle className="mr-2" />
                                Next
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        )}
        
        {stage === 'question_review' && videoRecordings[currentQuestionIndex] && (
            <CardContent className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center pt-6">
                {/* Left column */}
                <div className="space-y-6 flex flex-col justify-center">
                    <div className="space-y-2">
                        <CardTitle>Review Your Answer for Question {currentQuestionIndex + 1}</CardTitle>
                        <CardDescription>You can re-record or proceed. The preview includes audio.</CardDescription>
                        <Progress value={((currentQuestionIndex + 1) / questions.length) * 100} className="mt-2" />
                    </div>
                    <div className="flex justify-start gap-4">
                        <Button size="lg" variant="outline" onClick={handleRerecord} disabled={isTranscribing}>
                            <RefreshCw className="mr-2" /> Re-record
                        </Button>
                        <Button size="lg" onClick={processAndAdvance} disabled={isTranscribing}>
                            {isTranscribing && <Loader2 className="mr-2 animate-spin" />}
                            {!isTranscribing && (isLastQuestion ? <Send className="mr-2"/> : <ArrowRight className="mr-2" />)}
                            {isLastQuestion ? 'Finish & Submit' : 'Next Question'}
                        </Button>
                    </div>
                </div>
                {/* Right column */}
                <div className="space-y-4">
                    <div className="aspect-video w-full rounded-md border bg-black overflow-hidden">
                        <video src={videoRecordings[currentQuestionIndex]!} className="w-full h-full" playsInline controls autoPlay />
                    </div>
                </div>
            </CardContent>
        )}
        </Card>
    </div>
  );
}
