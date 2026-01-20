
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Question, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Video, StopCircle, RefreshCw, Send, AlertTriangle, ArrowRight, PartyPopper, Camera, CheckCircle, Wifi, Mic } from 'lucide-react';
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
            // @ts-ignore
            if (audioContext && audioContext.state !== 'closed') audioContext.close();
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
  // const audioRef = useRef<HTMLAudioElement | null>(null);
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

  const getCameraPermission = useCallback(async () => {
    if (streamRef.current && videoRef.current?.srcObject) {
        return true;
    }

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : true,
            audio: selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : true
        });
        streamRef.current = stream;
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
  
    const setupDevicesAndStream = async () => {
      let specificStream: MediaStream | null = null;
      try {
        // Request a temporary stream just to get permissions and enumerate devices
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (isCancelled) {
          initialStream.getTracks().forEach(track => track.stop());
          return;
        }
  
        setCameraCheck('success');
        setMicCheck('success');
        setHasCameraPermission(true);
  
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audio = devices.filter(d => d.kind === 'audioinput');
        const video = devices.filter(d => d.kind === 'videoinput');
        setAudioDevices(audio);
        setVideoDevices(video);
  
        // We have the lists, stop the temporary stream
        initialStream.getTracks().forEach(track => track.stop());
  
        const currentAudioId = selectedAudioDeviceId || (audio.length > 0 ? audio[0].deviceId : '');
        const currentVideoId = selectedVideoDeviceId || (video.length > 0 ? video[0].deviceId : '');
  
        if (!selectedAudioDeviceId && currentAudioId) setSelectedAudioDeviceId(currentAudioId);
        if (!selectedVideoDeviceId && currentVideoId) setSelectedVideoDeviceId(currentVideoId);
  
        if (!currentVideoId || !currentAudioId) {
          throw new Error("No video or audio devices found.");
        }
  
        specificStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: currentVideoId } },
          audio: { deviceId: { exact: currentAudioId } }
        });
  
        if (isCancelled) {
          specificStream.getTracks().forEach(track => track.stop());
          return;
        }
  
        setPreviewStream(specificStream);
        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = specificStream;
        }
  
      } catch (error: any) {
        if (isCancelled) return;
        console.error('Permission or device setup failed:', error);
        setHasCameraPermission(false);
        setCameraCheck('error');
        setMicCheck('error');
      }
    };
  
    setupDevicesAndStream();
    
    if (internetCheckStatus === 'pending') {
        checkInternetSpeed();
    }
  
    return () => {
      isCancelled = true;
      if (previewStream) {
          previewStream.getTracks().forEach(track => track.stop());
          setPreviewStream(null);
      }
    };
  }, [stage, selectedAudioDeviceId, selectedVideoDeviceId, internetCheckStatus, checkInternetSpeed, previewStream]);


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
  
    // if (audioRef.current) {
    //   audioRef.current.pause();
    //   audioRef.current.currentTime = 0;
    // }
  
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
  
      setIsRecording(false);
      setStage('reviewing');
      
      stopCamera();
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

  // useEffect(() => {
  //   if (stage === 'answering' && currentQuestion?.audio_url && audioRef.current) {
  //       audioRef.current.src = currentQuestion.audio_url;
  //       audioRef.current.play().catch(error => console.error("Audio playback failed:", error));
  //   }
  // }, [currentQuestion, stage]);


  useEffect(() => {
    // This is the cleanup function that runs when the component unmounts.
    return () => {
        // Stop any active camera streams.
        stopCamera();

        // Stop any media recorder instance.
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }

        // Revoke any created object URLs to prevent memory leaks.
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
    <div className="flex items-center justify-center min-h-screen w-full p-4 sm:p-6 lg:p-8">
        <Card className="w-full max-w-6xl">
            {/* <audio ref={audioRef} /> */}
            {stage === 'introduction' && (
                <>
                    <CardHeader className="text-center">
                        <CardTitle className="font-headline text-3xl md:text-4xl">Your Interview is Ready</CardTitle>
                        <CardDescription>First, let's check your setup. You'll be asked {questions.length} questions.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 items-start">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <ul className="space-y-3">
                                <li className="p-3 rounded-lg bg-secondary space-y-3">
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
                                <li className="flex items-center justify-between p-3 rounded-lg bg-secondary">
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
                            <div className="p-3 rounded-lg bg-secondary space-y-3">
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
                    <CardFooter className="flex-col items-center gap-4">
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
        
        {(stage === 'answering' || stage === 'recording') && (
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                {/* Left column */}
                <div className="space-y-6 flex flex-col h-full">
                    <div className="space-y-2">
                        <CardTitle>Question {currentQuestionIndex + 1} of {questions.length}</CardTitle>
                        <CardDescription>Category: <strong>{currentQuestion?.categoryName}</strong></CardDescription>
                        <Progress value={progressValue} className="mt-2" />
                    </div>
                    <div className="text-left p-6 border rounded-lg bg-secondary flex-grow flex items-center">
                        <p className="text-2xl font-bold font-headline">{currentQuestion?.text}</p>
                    </div>
                    <div className="flex justify-start">
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
                </div>

                {/* Right column */}
                <div className="space-y-4 sticky top-8">
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
                </div>
            </CardContent>
        )}
        
        {stage === 'reviewing' && videoRecordings[currentQuestionIndex] && (
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start pt-6">
                {/* Left column */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <CardTitle>Review Your Answer for Question {currentQuestionIndex + 1}</CardTitle>
                        <CardDescription>You can re-record or proceed. Note: this is a silent preview.</CardDescription>
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
                <div className="space-y-4 sticky top-8">
                    <div className="aspect-video w-full rounded-md border bg-black overflow-hidden">
                        <video src={videoRecordings[currentQuestionIndex]!} className="w-full h-full" playsInline autoPlay loop muted />
                    </div>
                </div>
            </CardContent>
        )}
        </Card>
    </div>
  );
}
