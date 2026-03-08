
// src/app/authenticated/profile/page.tsx
'use client';
import { type UserProfile, updateUserProfile, getUserProfile } from '@/server/db/user-data';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { deleteAccount, logout } from '@/lib/auth';
import { LogOut, User as UserIcon, Edit, GraduationCap, BookUser, FileText, Trash2, AlertTriangle, Phone, Mail, Cake, Briefcase, Loader2, Building, Hash, BadgeCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { EditProfileForm } from '@/features/profile/EditProfileForm';
import { EditableInfoField } from '@/features/profile/EditableInfoField';
import { DownloadResumeButton } from '@/features/profile/DownloadResumeButton';
import { ScholarshipActivityChart } from '@/features/profile/ScholarshipActivityChart';
import { TiltCard } from '@/features/profile/TiltCard';
import { useAuth } from '@/app/auth-provider';
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
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { linkWithPopup, GoogleAuthProvider, updateProfile } from 'firebase/auth';
import { AvatarUploadModal } from '@/features/profile/AvatarUploadModal';

export default function ProfilePage() {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const authContext = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const authLoading = authContext ? authContext.loading : true;
  const user = authContext ? authContext.user : null;

  useEffect(() => {
    if (!authLoading && user && db) {
      setProfileLoading(true);
      getUserProfile(db, user.uid)
        .then(profile => {
          setUserProfile(profile);
        })
        .catch(console.error)
        .finally(() => {
          setProfileLoading(false);
        });
    } else if (!authLoading && !user) {
      // If auth is done and there's no user, stop loading.
      setProfileLoading(false);
    }
  }, [authLoading, user, db]);


  const handleLogout = async () => {
    if (!auth) return;
    await logout(auth);
    router.push('/login');
  };

  const handleDeleteAccount = async () => {
    if (!user || !auth || !db) return;
    setIsDeleting(true);
    try {
      await deleteAccount(auth, db, user.uid);
      toast({
        title: "Account Deleted",
        description: "Your account and all associated data have been permanently removed.",
      });
      router.push('/login');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Deletion Failed",
        description: `An error occurred: ${error.message}. Please try logging out and back in again.`,
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
      return `${names[0][0]}${names[names.length - 1][0]}`;
    }
    return name[0] || 'U';
  };

  const handleLinkGoogle = async () => {
    if (!auth || !auth.currentUser) return;
    try {
      const provider = new GoogleAuthProvider();
      const customParams: Record<string, string> = { prompt: 'select_account' };
      if (userProfile?.email) {
        customParams.login_hint = userProfile.email;
      }
      provider.setCustomParameters(customParams);
      await linkWithPopup(auth.currentUser, provider);
      toast({
        title: "Account Linked!",
        description: "Your Google account has been successfully linked.",
      });
      // Force a re-render to reflect the newly linked provider data
      setProfileLoading(true);
      const updatedProfile = await getUserProfile(db!, auth.currentUser.uid);
      setUserProfile(updatedProfile);
      setProfileLoading(false);
    } catch (error: any) {
      if (error.code === 'auth/credential-already-in-use') {
        toast({ variant: 'destructive', title: "Linking Failed", description: "This Google account is already linked to another user." });
      } else {
        toast({ variant: 'destructive', title: "Linking Failed", description: error.message });
      }
    }
  };

  const handleInlineSave = async (fieldKey: string, newValue: any) => {
    if (!user || !db || !userProfile) return;
    try {
      if (fieldKey === 'fullName' && newValue !== user.displayName) {
        // Also update standard Firebase Auth display name
        await updateProfile(user, { displayName: newValue }).catch(console.error);
      }

      const updateData = { [fieldKey]: newValue };
      await updateUserProfile(db, user.uid, updateData);
      setUserProfile((prev) => prev ? { ...prev, ...updateData } : null);

      toast({
        title: "Updated Successfully",
        description: "Your profile has been saved.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: error.message
      });
      throw error;
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
          <div className="md:col-span-2 space-y-8">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile || !user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-16 bg-card rounded-lg shadow-md">
          <h2 className="text-2xl font-headline font-semibold text-card-foreground">Profile Not Found</h2>
          <p className="text-muted-foreground mt-2">We couldn't load your profile. Please try logging out and back in.</p>
          <Button onClick={handleLogout} variant="destructive" className="mt-4">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    )
  }

  const googleProvider = user.providerData.find(p => p.providerId === 'google.com');
  const isGoogleLinked = !!googleProvider;
  const linkedGoogleEmail = googleProvider?.email || null;

  const calculateAge = (dob: any) => {
    if (!dob) return null;
    const birthDate = new Date(dob instanceof Date ? dob : (dob.toDate ? dob.toDate() : new Date(dob as string | number)));
    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      computedAge--;
    }
    return computedAge;
  };

  const calculateCompletion = (profile: UserProfile): number => {
    const coreFields = [
      profile.fullName,
      profile.email,
      profile.phone,
      profile.dob,
      profile.address,
      profile.qualification,
      profile.college,
      profile.fieldOfStudy,
      profile.aadhar
    ];
    const filledFields = coreFields.filter(f => f && f.toString().trim() !== '');
    return Math.round((filledFields.length / coreFields.length) * 100);
  };

  const completionPercentage = calculateCompletion(userProfile);

  return (
    <div className="bg-secondary/50 min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Left Column */}
          <div className="lg:col-span-1 space-y-8 mt-12 lg:mt-0">
            <TiltCard>
              <Card className="shadow-lg text-center mt-12 transition-all hover:shadow-xl">
                <CardContent className="p-6">
                  <AvatarUploadModal
                    user={user}
                    currentPhotoUrl={user.photoURL}
                    onUploadSuccess={(newUrl: string) => {
                      // Force a re-render to catch the new photoURL from the firebase user object
                      setUserProfile(prev => prev ? { ...prev, photoURL: newUrl } : null);
                    }}
                  >
                    <div className="relative group cursor-pointer w-28 h-28 mx-auto -mt-16 mb-4">
                      <Avatar className="h-28 w-28 border-4 border-background shadow-lg transition-transform group-hover:scale-105 group-hover:shadow-xl">
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} className="object-cover" />
                        <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">
                          {getInitials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="text-white text-xs font-semibold flex flex-col items-center gap-1">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </div>
                      </div>
                    </div>
                  </AvatarUploadModal>
                  <h2 className="text-2xl font-headline font-bold">{userProfile.fullName}</h2>
                  <p className="text-muted-foreground">{userProfile.email}</p>

                  <div className="mt-6 mb-4 text-left">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium text-muted-foreground">Profile Status</span>
                      {completionPercentage < 40 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800/50">🥉 Bronze</span>}
                      {completionPercentage >= 40 && completionPercentage < 70 && <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700">🥈 Silver</span>}
                      {completionPercentage >= 70 && completionPercentage < 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 font-bold border border-yellow-300 dark:border-yellow-700/50">🥇 Gold</span>}
                      {completionPercentage === 100 && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white dark:bg-blue-900/40 dark:text-blue-300 font-bold border border-blue-700 dark:border-blue-800/50 shadow-sm shadow-blue-500/20">💎 Verified</span>}
                    </div>
                    <div className="relative pt-1">
                      <div className="flex mb-2 items-center justify-between">
                        <div>
                          <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-theme-600 dark:text-theme-400 bg-theme-100 dark:bg-theme-900">
                            {completionPercentage}% Complete
                          </span>
                        </div>
                      </div>
                      <Progress value={completionPercentage} className="h-2 w-full bg-theme-100 dark:bg-secondary [&>div]:bg-theme-500" />
                    </div>

                    {completionPercentage < 100 && (
                      <div className="mt-4 p-3 bg-theme-50 dark:bg-theme-900/20 border border-theme-100 dark:border-theme-800 rounded-lg animate-in slide-in-from-bottom-2">
                        <p className="text-xs text-theme-800 dark:text-theme-200 font-medium flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-theme-500 shrink-0 mt-0.5" />
                          <span>Reach the next tier to unlock more targeted scholarship matches!</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mb-6">
                    <DownloadResumeButton userProfile={userProfile} completionPercentage={completionPercentage} />
                  </div>


                  <EditProfileForm
                    user={user}
                    userProfile={userProfile}
                    onProfileUpdate={(updatedProfile) => {
                      setUserProfile(updatedProfile);
                    }}
                    isOpen={isEditDialogOpen}
                    setIsOpen={setIsEditDialogOpen}
                  >
                    <Button onClick={() => setIsEditDialogOpen(true)} className="mt-4 w-full">
                      <Edit className="mr-2 h-4 w-4" /> Edit Profile
                    </Button>
                  </EditProfileForm>
                </CardContent>
              </Card>


            </TiltCard>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-8">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
              <ScholarshipActivityChart userId={user.uid} userProfile={userProfile} />
            </div>

            <TiltCard intensity={10}>
              <Card className="transition-all hover:shadow-lg dark:hover:shadow-theme-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-xl"><BookUser className="text-theme-600 dark:text-theme-400" /> Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditableInfoField icon={<UserIcon />} label="Full Name" value={userProfile.fullName} placeholder="Not set" fieldKey="fullName" onSave={handleInlineSave} />
                  <EditableInfoField icon={<Mail />} label="Email Address" value={userProfile.email} placeholder="Not set" fieldKey="email" onSave={handleInlineSave} disabled={true} />
                  <EditableInfoField icon={<Phone />} label="Phone Number" value={userProfile.phone} placeholder="e.g., 9876543210" fieldKey="phone" onSave={handleInlineSave} />
                  <EditableInfoField icon={<Cake />} label="Date of Birth" value={userProfile.dob as unknown as string | Date} placeholder="Not set" fieldKey="dob" type="date" onSave={handleInlineSave} />
                  <EditableInfoField icon={<UserIcon />} label="Age" value={calculateAge(userProfile.dob) || userProfile.age} placeholder="Not set" fieldKey="age" onSave={handleInlineSave} disabled={true} />
                  <EditableInfoField icon={<UserIcon />} label="Address" value={userProfile.address} placeholder="e.g., 123, Main St, Mumbai, India" fieldKey="address" onSave={handleInlineSave} />
                </CardContent>
              </Card>
            </TiltCard>

            <TiltCard intensity={10}>
              <Card className="transition-all hover:shadow-lg dark:hover:shadow-theme-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-xl"><GraduationCap className="text-theme-600 dark:text-theme-400" /> Educational Background</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <EditableInfoField icon={<Briefcase />} label="Highest Qualification" value={userProfile.qualification} placeholder="Not set" fieldKey="qualification" onSave={handleInlineSave} />
                  <EditableInfoField icon={<GraduationCap />} label="Current School/College" value={userProfile.college} placeholder="e.g., University of Delhi" fieldKey="college" onSave={handleInlineSave} />
                  <EditableInfoField icon={<BookUser />} label="Field of Study" value={userProfile.fieldOfStudy} placeholder="e.g., Computer Science" fieldKey="fieldOfStudy" onSave={handleInlineSave} />
                </CardContent>
              </Card>
            </TiltCard>

            <TiltCard intensity={10}>
              <Card className="transition-all hover:shadow-lg dark:hover:shadow-theme-900/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-headline text-xl"><FileText className="text-theme-600 dark:text-theme-400" /> Documents & Identity</CardTitle>
                </CardHeader>
                <CardContent>
                  <EditableInfoField icon={<FileText />} label="Aadhar Number" value={userProfile.aadhar} placeholder="e.g., 1234 5678 9012" fieldKey="aadhar" onSave={handleInlineSave} />
                </CardContent>
              </Card>
            </TiltCard>
          </div>

        </div>
      </div>
    </div>
  );
}
