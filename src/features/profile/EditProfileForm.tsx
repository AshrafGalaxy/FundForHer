
// src/components/EditProfileForm.tsx
'use client';

import { useState, type Dispatch, type SetStateAction, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { CalendarIcon, Loader2, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { type UserProfile, updateUserProfile } from '@/server/db/user-data';
import type { User } from 'firebase/auth';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { updateProfile } from 'firebase/auth';

const formSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters.' }),
  phone: z.string().regex(/^\d{10}$/, { message: 'Please enter a valid 10-digit phone number.' }),
  dob: z.string().optional(),
  qualification: z.string().min(2, { message: 'Please specify your qualification.' }),
  address: z.string().min(10, { message: 'Address must be at least 10 characters.' }).or(z.literal('')),
  college: z.string().min(3, { message: 'College name must be at least 3 characters.' }).or(z.literal('')),
  fieldOfStudy: z.string().min(2, { message: 'Field of study must be at least 2 characters.' }).or(z.literal('')),
  aadhar: z.string().regex(/^\d{12}$/, { message: 'Please enter a valid 12-digit Aadhar number.' }).or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface EditProfileFormProps {
  user: User;
  userProfile: UserProfile;
  onProfileUpdate: (updatedProfile: UserProfile) => void;
  children: React.ReactNode;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
}

export function EditProfileForm({ user, userProfile, onProfileUpdate, children, isOpen, setIsOpen }: EditProfileFormProps) {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      dob: '',
      address: '',
      college: '',
      fieldOfStudy: '',
      aadhar: '',
      qualification: '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        fullName: userProfile.fullName || '',
        phone: userProfile.phone || '',
        dob: userProfile.dob ? format(userProfile.dob instanceof Date ? userProfile.dob : ((userProfile.dob as any).toDate ? (userProfile.dob as any).toDate() : new Date((userProfile.dob as unknown) as string | number)), 'yyyy-MM-dd') : '',
        qualification: userProfile.qualification || '',
        address: userProfile.address || '',
        college: userProfile.college || '',
        fieldOfStudy: userProfile.fieldOfStudy || '',
        aadhar: userProfile.aadhar || '',
      })
    }
  }, [userProfile, isOpen, form]);


  async function onSubmit(values: FormValues) {
    if (!auth || !db) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firebase not initialized.' });
      return;
    }
    setIsLoading(true);
    try {
      const updateData = {
        ...values,
        dob: values.dob ? new Date(values.dob) : userProfile.dob,
        address: values.address || null,
        college: values.college || null,
        fieldOfStudy: values.fieldOfStudy || null,
        aadhar: values.aadhar || null,
      };

      if (values.fullName && values.fullName !== user.displayName) {
        await updateProfile(user, { displayName: values.fullName });
      }

      await updateUserProfile(db, user.uid, updateData);

      onProfileUpdate({ ...userProfile, ...updateData });

      toast({
        title: 'Profile Updated!',
        description: 'Your information has been successfully saved.',
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
    finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-2xl">Edit Profile</DialogTitle>
          <DialogDescription>
            Make changes to your profile here. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto pr-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Priya Sharma" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="9876543210" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="qualification"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Highest Qualification</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your current qualification" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Class 10">Class 10</SelectItem>
                      <SelectItem value="Class 12">Class 12</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                      <SelectItem value="Undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="Postgraduate">Postgraduate</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Your complete residential address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="college"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>School/College Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Delhi University" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fieldOfStudy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Field of Study</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Computer Science" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aadhar"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aadhar Number</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Changes
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
