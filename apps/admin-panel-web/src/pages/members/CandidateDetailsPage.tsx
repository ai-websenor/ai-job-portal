import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Users,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  CheckCircle,
  XCircle,
  Shield,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import routePath from '@/routes/routePath';
import { isDeletedUser, getEffectiveActiveStatus } from '@/lib/deletedUser';

interface CandidateDetails {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  role: string;
  isVerified: boolean;
  isMobileVerified: boolean;
  isActive: boolean;
  onboardingStep: number;
  isOnboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  profile?: {
    id?: string;
    headline?: string;
    summary?: string;
    location?: string;
    experience?: string;
    currentJobTitle?: string;
    currentCompany?: string;
    totalExperience?: number;
    expectedSalary?: number;
    noticePeriod?: string;
    dateOfBirth?: string;
    gender?: string;
    skills?: string[];
    languages?: string[];
  };
}

export default function CandidateDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['candidate', id],
    queryFn: async () => {
      const response = await http.get(endpoints.candidate.details(id!));
      return response as unknown as { data: CandidateDetails; message: string };
    },
    enabled: !!id,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (status: 'active' | 'suspended') => {
      return await http.put(endpoints.user.updateStatus(id!), { status });
    },
    onSuccess: (_data, status) => {
      queryClient.invalidateQueries({ queryKey: ['candidate', id] });
      queryClient.invalidateQueries({ queryKey: ['candidates'] });
      const action = status === 'active' ? 'unblocked' : 'blocked';
      toast.success(`Candidate ${action} successfully`);
      setIsBlockDialogOpen(false);
    },
    onError: () => {
      toast.error('Failed to update candidate status');
    },
  });

  const candidate = data?.data;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(routePath.MEMBER.CANDIDATES)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Candidates
        </Button>
        <div className="flex items-center justify-center py-16">
          <p className="text-muted-foreground">Loading candidate details...</p>
        </div>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate(routePath.MEMBER.CANDIDATES)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Candidates
        </Button>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <XCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-red-500 font-semibold">Failed to load candidate details</p>
          <p className="text-muted-foreground text-sm mt-2">
            {error instanceof Error ? error.message : 'Candidate not found'}
          </p>
        </div>
      </div>
    );
  }

  const isDeleted = isDeletedUser(candidate.email);
  const effectiveActive = getEffectiveActiveStatus(candidate.email, candidate.isActive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(routePath.MEMBER.CANDIDATES)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {candidate.firstName} {candidate.lastName}
            </h1>
            <p className="text-muted-foreground">Candidate Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isDeleted ? (
            <Badge className="bg-red-100 text-red-800">Deleted</Badge>
          ) : effectiveActive ? (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Suspended
            </Badge>
          )}
          {candidate.isVerified && (
            <Badge className="bg-blue-100 text-blue-800">
              <Shield className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
          {!isDeleted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBlockDialogOpen(true)}
              className={
                effectiveActive
                  ? 'border-orange-300 text-orange-600 hover:bg-orange-50'
                  : 'border-green-300 text-green-600 hover:bg-green-50'
              }
            >
              {effectiveActive ? (
                <>
                  <Ban className="h-4 w-4 mr-1" />
                  Block
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  Unblock
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">First Name</p>
                <p className="font-medium">{candidate.firstName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Last Name</p>
                <p className="font-medium">{candidate.lastName}</p>
              </div>
            </div>
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> Email
              </p>
              <p className="font-medium">{isDeleted ? 'Deleted User' : candidate.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3" /> Mobile
              </p>
              <p className="font-medium">{candidate.mobile || 'N/A'}</p>
            </div>
            {candidate.profile?.gender && (
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium capitalize">{candidate.profile.gender}</p>
              </div>
            )}
            {candidate.profile?.dateOfBirth && (
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">{formatDate(candidate.profile.dateOfBirth)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidate.profile?.headline && (
              <div>
                <p className="text-sm text-muted-foreground">Headline</p>
                <p className="font-medium">{candidate.profile.headline}</p>
              </div>
            )}
            {candidate.profile?.currentJobTitle && (
              <div>
                <p className="text-sm text-muted-foreground">Current Job Title</p>
                <p className="font-medium">{candidate.profile.currentJobTitle}</p>
              </div>
            )}
            {candidate.profile?.currentCompany && (
              <div>
                <p className="text-sm text-muted-foreground">Current Company</p>
                <p className="font-medium">{candidate.profile.currentCompany}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" /> Location
              </p>
              <p className="font-medium">{candidate.profile?.location || 'N/A'}</p>
            </div>
            {candidate.profile?.totalExperience !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Total Experience</p>
                <p className="font-medium">
                  {candidate.profile.totalExperience}{' '}
                  {candidate.profile.totalExperience === 1 ? 'year' : 'years'}
                </p>
              </div>
            )}
            {candidate.profile?.expectedSalary !== undefined && (
              <div>
                <p className="text-sm text-muted-foreground">Expected Salary</p>
                <p className="font-medium">{candidate.profile.expectedSalary.toLocaleString()}</p>
              </div>
            )}
            {candidate.profile?.noticePeriod && (
              <div>
                <p className="text-sm text-muted-foreground">Notice Period</p>
                <p className="font-medium">{candidate.profile.noticePeriod}</p>
              </div>
            )}
            {!candidate.profile?.headline &&
              !candidate.profile?.currentJobTitle &&
              !candidate.profile?.location &&
              candidate.profile?.totalExperience === undefined && (
                <p className="text-muted-foreground text-sm">
                  No professional information available
                </p>
              )}
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Email Verified</p>
                <p className="font-medium">{candidate.isVerified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mobile Verified</p>
                <p className="font-medium">{candidate.isMobileVerified ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Onboarding Completed</p>
                <p className="font-medium">{candidate.isOnboardingCompleted ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onboarding Step</p>
                <p className="font-medium">{candidate.onboardingStep}</p>
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(candidate.createdAt)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p className="font-medium">{formatDate(candidate.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary */}
        {candidate.profile?.summary && (
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{candidate.profile.summary}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Block/Unblock Confirmation Dialog */}
      <AlertDialog open={isBlockDialogOpen} onOpenChange={setIsBlockDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {effectiveActive ? 'Block Candidate?' : 'Unblock Candidate?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {effectiveActive ? (
                <>
                  Are you sure you want to block{' '}
                  <strong>
                    {candidate.firstName} {candidate.lastName}
                  </strong>
                  ?<br />
                  Their active sessions will be invalidated immediately and they will be logged out.
                </>
              ) : (
                <>
                  Are you sure you want to unblock{' '}
                  <strong>
                    {candidate.firstName} {candidate.lastName}
                  </strong>
                  ?<br />
                  They will be able to log in again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => toggleStatusMutation.mutate(effectiveActive ? 'suspended' : 'active')}
              className={
                effectiveActive
                  ? 'bg-orange-500 hover:bg-orange-600'
                  : 'bg-green-500 hover:bg-green-600'
              }
            >
              {toggleStatusMutation.isPending
                ? effectiveActive
                  ? 'Blocking...'
                  : 'Unblocking...'
                : effectiveActive
                  ? 'Block'
                  : 'Unblock'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
