
// src/app/authenticated/profile/page.tsx
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { deleteAccount, logout } from '@/lib/auth';
import { LogOut, User as UserIcon, Edit, GraduationCap, BookUser, FileText, Trash2, AlertTriangle, Phone, Mail, Cake, Briefcase, Loader2, Building, Hash, BadgeCheck } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { type UserProfile, updateUserProfile, getUserProfile } from '@/server/db/user-data';
import { EditProfileForm } from '@/features/profile/EditProfileForm';
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
import { linkWithPopup, GoogleAuthProvider } from 'firebase/auth';

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

  const InfoField = ({ icon, label, value, placeholder }: { icon: React.ReactNode, label: string, value: string | number | null | undefined, placeholder: string }) => (
    <div className="flex items-start gap-3">
      <div className="text-theme-600 dark:text-theme-400 mt-1">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold text-foreground">{value || <span className="text-muted-foreground italic">{placeholder}</span>}</p>
      </div>
    </div>
  );

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
            <Card className="shadow-lg text-center mt-12">
              <CardContent className="p-6">
                <Avatar className="h-28 w-28 border-4 border-background shadow-lg mx-auto -mt-16 mb-4">
                  <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'User'} />
                  <AvatarFallback className="text-4xl font-bold bg-primary text-primary-foreground">
                    {getInitials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-2xl font-headline font-bold">{userProfile.fullName}</h2>
                <p className="text-muted-foreground">{userProfile.email}</p>

                <div className="mt-6 mb-4 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-muted-foreground">Profile Completion</span>
                    <span className="text-sm font-bold text-theme-600 dark:text-theme-400">{completionPercentage}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-2 w-full" />
                  {completionPercentage < 100 && (
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Complete your profile to access more scholarships!
                    </p>
                  )}
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

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-xl">Account Actions</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {isGoogleLinked ? (
                  <div className="flex items-center gap-3 p-3 border rounded-md bg-green-50 border-green-200">
                    <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">Linked to Google</p>
                      <p className="text-xs text-green-600 truncate">{linkedGoogleEmail || 'Connected'}</p>
                    </div>
                    <BadgeCheck className="h-5 w-5 text-green-600" />
                  </div>
                ) : (
                  <Button onClick={handleLinkGoogle} variant="outline" className="w-full justify-start text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200">
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Connect Google Account
                  </Button>
                )}
                <Button onClick={handleLogout} variant="outline" className="w-full justify-start">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full justify-start">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Account
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="text-destructive" />Are you absolutely sure?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This action is permanent and cannot be undone. This will permanently delete your account and remove all of your data from our servers.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-xl"><BookUser className="text-theme-600 dark:text-theme-400" /> Personal Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField icon={<UserIcon />} label="Full Name" value={userProfile.fullName} placeholder="Not set" />
                <InfoField icon={<Mail />} label="Email Address" value={userProfile.email} placeholder="Not set" />
                <InfoField icon={<Phone />} label="Phone Number" value={userProfile.phone} placeholder="e.g., 9876543210" />
                <InfoField icon={<Cake />} label="Date of Birth" value={userProfile.dob ? format(userProfile.dob instanceof Date ? userProfile.dob : ((userProfile.dob as any).toDate ? (userProfile.dob as any).toDate() : new Date((userProfile.dob as unknown) as string | number)), 'PPP') : null} placeholder="Not set" />
                <InfoField icon={<UserIcon />} label="Age" value={userProfile.age} placeholder="Not set" />
                <InfoField icon={<UserIcon />} label="Address" value={userProfile.address} placeholder="e.g., 123, Main St, Mumbai, India" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-xl"><GraduationCap className="text-theme-600 dark:text-theme-400" /> Educational Background</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InfoField icon={<Briefcase />} label="Highest Qualification" value={userProfile.qualification} placeholder="Not set" />
                <InfoField icon={<GraduationCap />} label="Current School/College" value={userProfile.college} placeholder="e.g., University of Delhi" />
                <InfoField icon={<BookUser />} label="Field of Study" value={userProfile.fieldOfStudy} placeholder="e.g., Computer Science" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-headline text-xl"><FileText className="text-theme-600 dark:text-theme-400" /> Documents & Identity</CardTitle>
              </CardHeader>
              <CardContent>
                <InfoField icon={<FileText />} label="Aadhar Number" value={userProfile.aadhar} placeholder="e.g., 1234 5678 9012" />
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}
