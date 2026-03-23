/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  CheckCircle,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  Video,
  User,
  Calendar,
  Search,
  Filter,
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import type { IVideoResume } from '@/types';

const VideoResumeListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedStatus, setAppliedStatus] = useState<string>('all');

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<IVideoResume | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch video resumes
  const { data, isLoading, error } = useQuery({
    queryKey: ['videoResumes', page, limit, appliedSearch, appliedStatus],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (appliedSearch) params.set('search', appliedSearch);
      if (appliedStatus && appliedStatus !== 'all') params.set('status', appliedStatus);

      const response = await http.get(`${endpoints.videoResume.list}?${params}`);
      return response as unknown as {
        data: IVideoResume[];
        meta: { total: number; page: number; limit: number; totalPages: number };
      };
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (profileId: string) => {
      return await http.put(endpoints.videoResume.updateStatus(profileId), { status: 'approved' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoResumes'] });
      toast.success('Video resume approved successfully');
      setApproveDialogOpen(false);
      setSelectedVideo(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to approve video resume');
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ profileId, reason }: { profileId: string; reason: string }) => {
      return await http.put(endpoints.videoResume.updateStatus(profileId), {
        status: 'rejected',
        rejectionReason: reason,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoResumes'] });
      toast.success('Video resume rejected successfully');
      setRejectDialogOpen(false);
      setSelectedVideo(null);
      setRejectionReason('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reject video resume');
    },
  });

  const handleApproveClick = (video: IVideoResume) => {
    setSelectedVideo(video);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (video: IVideoResume) => {
    setSelectedVideo(video);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleViewVideo = (video: IVideoResume) => {
    setSelectedVideo(video);
    setVideoDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (selectedVideo) approveMutation.mutate(selectedVideo.id);
  };

  const handleRejectConfirm = () => {
    if (!selectedVideo) return;
    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }
    rejectMutation.mutate({ profileId: selectedVideo.id, reason: rejectionReason.trim() });
  };

  const handleApplyFilters = () => {
    setPage(1);
    setAppliedSearch(search);
    setAppliedStatus(statusFilter);
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setAppliedSearch('');
    setAppliedStatus('all');
    setPage(1);
  };

  const getStatusBadge = (status: IVideoResume['videoProfileStatus']) => {
    if (!status || status === 'pending') {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      );
    }
    if (status === 'approved') {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    );
  };

  const getCandidateName = (video: IVideoResume) => {
    const name = `${video.firstName || ''} ${video.lastName || ''}`.trim();
    return name || 'N/A';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const totalPages = data?.meta?.totalPages || 1;
  const currentPage = data?.meta?.page || 1;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Video Resume Moderation</h1>
        <p className="text-muted-foreground mt-1">Review and moderate candidate video resumes</p>
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle>Video Resumes</CardTitle>
              <CardDescription>{data?.meta?.total ?? 0} total video resume(s)</CardDescription>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name, email or ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <Filter className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleApplyFilters}>Apply</Button>

            {(appliedSearch || appliedStatus !== 'all') && (
              <Button variant="outline" onClick={handleClearFilters}>
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading video resumes...</div>
          ) : error ? (
            <div className="text-center py-12 text-red-500">
              Failed to load video resumes. Please try again.
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center py-14">
              <Video className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No video resumes found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {appliedSearch || appliedStatus !== 'all'
                  ? 'Try adjusting your filters.'
                  : 'Video resumes will appear here when candidates upload them.'}
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead>Rejection Reason</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data.map((video) => (
                    <TableRow key={video.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <div className="font-medium">{getCandidateName(video)}</div>
                            <div className="text-xs text-muted-foreground font-mono">
                              {video.userId.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{video.email || '—'}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(video.videoProfileStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {formatDate(video.videoUploadedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[180px] truncate text-sm text-muted-foreground">
                          {video.videoRejectionReason || '—'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewVideo(video)}
                          >
                            <Video className="h-4 w-4 mr-1" />
                            View
                          </Button>

                          {/* Approve: show for pending or rejected */}
                          {video.videoProfileStatus !== 'approved' && (
                            <Button
                              variant="default"
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveClick(video)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          )}

                          {/* Reject: show for pending or approved */}
                          {video.videoProfileStatus !== 'rejected' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRejectClick(video)}
                              disabled={rejectMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages} &nbsp;·&nbsp; {data.meta.total} total
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <AlertDialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Video Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve the video resume for{' '}
              <strong>{selectedVideo ? getCandidateName(selectedVideo) : ''}</strong>? This will
              make the video visible to employers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApproveConfirm}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video Resume</DialogTitle>
            <DialogDescription>
              Provide a reason for rejection. The candidate will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="e.g., Video quality is too low, inappropriate content..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            {selectedVideo && (
              <div className="bg-muted p-3 rounded-md text-sm space-y-1">
                <div className="font-medium">Candidate: {getCandidateName(selectedVideo)}</div>
                {selectedVideo.email && (
                  <div className="text-muted-foreground">{selectedVideo.email}</div>
                )}
                <div className="text-muted-foreground">
                  Uploaded: {formatDate(selectedVideo.videoUploadedAt)}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectionReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending || !rejectionReason.trim()}
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Video'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Video Preview Dialog */}
      <Dialog
        open={videoDialogOpen}
        onOpenChange={(open) => {
          setVideoDialogOpen(open);
          if (!open) setSelectedVideo(null);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Video Resume Preview</DialogTitle>
            <DialogDescription>Review the candidate&apos;s video resume</DialogDescription>
          </DialogHeader>

          {selectedVideo && (
            <div className="space-y-4">
              {/* Candidate Info */}
              <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/40 rounded-lg border">
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Name
                  </p>
                  <p className="font-semibold mt-0.5">{getCandidateName(selectedVideo)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Email
                  </p>
                  <p className="mt-0.5">{selectedVideo.email || '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    User ID
                  </p>
                  <p className="font-mono text-xs mt-0.5">{selectedVideo.userId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Uploaded
                  </p>
                  <p className="mt-0.5">{formatDate(selectedVideo.videoUploadedAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                    Status
                  </p>
                  <div className="mt-0.5">{getStatusBadge(selectedVideo.videoProfileStatus)}</div>
                </div>
                {selectedVideo.videoRejectionReason && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Rejection Reason
                    </p>
                    <p className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                      {selectedVideo.videoRejectionReason}
                    </p>
                  </div>
                )}
              </div>

              {/* Video Player */}
              {selectedVideo.videoUrl ? (
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <video
                    key={selectedVideo.videoUrl}
                    controls
                    autoPlay={false}
                    className="w-full h-full"
                    src={selectedVideo.videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <Video className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Video URL not available</p>
                  </div>
                </div>
              )}

              {/* Action Buttons in dialog */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                {selectedVideo.videoProfileStatus !== 'approved' && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => {
                      setVideoDialogOpen(false);
                      handleApproveClick(selectedVideo);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
                )}
                {selectedVideo.videoProfileStatus !== 'rejected' && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setVideoDialogOpen(false);
                      handleRejectClick(selectedVideo);
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoResumeListPage;
