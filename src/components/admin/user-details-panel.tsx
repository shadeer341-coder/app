'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import type { User } from '@/lib/types';
import { Mail, Repeat, User as UserIcon, Cake, Globe, University, Briefcase, GraduationCap, Building, Smartphone, X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '../ui/button';

export function UserDetailsPanel({ user, onClose }: { user: User; onClose: () => void }) {

  const getRoleDisplay = (user: User) => {
    if (user.role === 'admin') return { label: 'Admin', variant: 'destructive' as const };
    if (user.role === 'agency') return { label: 'Agency', variant: 'default' as const };
    if (user.role === 'student') return { label: 'Student', variant: 'secondary' as const };
    return { label: 'Individual', variant: 'outline' as const };
  }

  const roleDisplay = getRoleDisplay(user);

  return (
    <Card className="sticky top-24">
        <CardHeader className="text-left pb-4">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback className="text-xl">{user.name?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <CardTitle className="text-2xl">{user.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2 pt-1"><Mail className="h-4 w-4" />{user.email}</CardDescription>
                    </div>
                </div>
                 <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 flex-shrink-0">
                    <X className="h-5 w-5" />
                    <span className="sr-only">Close</span>
                </Button>
            </div>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-[60vh]">
                <div className="space-y-6 pb-6 pr-4">
                    <div className="space-y-4 text-sm">
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Role</span>
                            <Badge variant={roleDisplay.variant}>{roleDisplay.label}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Interview Quota</span>
                            <span className="font-medium flex items-center gap-2">
                                <Repeat className="h-4 w-4" />
                                {user.onboardingCompleted ? (user.interview_quota ?? 0) : 'Pending'}
                            </span>
                        </div>
                    </div>

                    {(user.role === 'individual' || user.role === 'student') && (
                        <>
                            <Separator />
                            <div className="space-y-4 text-sm">
                                <h4 className="font-medium text-base">Profile Details</h4>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4" />Gender</span>
                                    <span className="font-medium capitalize">{user.gender || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><Cake className="h-4 w-4" />Age</span>
                                    <span className="font-medium">{user.age || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" />Nationality</span>
                                    <span className="font-medium">{user.nationality || 'N/A'}</span>
                                </div>
                            </div>
                        </>
                    )}


                    {user.role === 'individual' || user.role === 'student' ? (
                        <>
                        <Separator />
                        <div className="space-y-4 text-sm">
                            <h4 className="font-medium text-base">Academic Information</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><Briefcase className="h-4 w-4" />Program</span>
                                <span className="font-medium text-right">{user.program || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><University className="h-4 w-4" />University</span>
                                <span className="font-medium text-right">{user.university || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><GraduationCap className="h-4 w-4" />Last Education</span>
                                <span className="font-medium text-right">{user.lastEducation || 'N/A'}</span>
                            </div>
                        </div>
                        </>
                    ) : null}

                    {user.role === 'agency' && (
                        <>
                        <Separator />
                        <div className="space-y-4 text-sm">
                            <h4 className="font-medium text-base">Agency Information</h4>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><Building className="h-4 w-4" />Agency Name</span>
                                <span className="font-medium text-right">{user.agency_name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><Globe className="h-4 w-4" />Agency Country</span>
                                <span className="font-medium text-right">{user.agency_country || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><UserIcon className="h-4 w-4" />Job Title</span>
                                <span className="font-medium text-right">{user.agency_job_title || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground flex items-center gap-2"><Smartphone className="h-4 w-4" />Mobile</span>
                                <span className="font-medium text-right">{user.mobile_number || 'N/A'}</span>
                            </div>
                        </div>
                        </>
                    )}
                </div>
            </ScrollArea>
        </CardContent>
    </Card>
  );
}
