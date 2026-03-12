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
} from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import type { IVideoResume } from '@/types';

const VideoResumeListPage = () => {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Dialog states
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<IVideoResume | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch video resumes
  const { data, isLoading, error } = useQuery({
    queryKey: ['videoResumes', page, limit],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
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
      return await http.put(endpoints.videoResume.updateStatus(profileId), {
        status: 'approved',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videoResumes'] });
      toast.success('Video resume approved successfully');
      setApproveDialogOpen(false);
      setSelectedVideo(null);
    },
    onError: (error: any) => {
      const errorMessage = error?.response?.data?.message || 'Failed to approve video resume';
      toast.error(errorMessage);
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
      const errorMessage = error?.response?.data?.message || 'Failed to reject video resume';
      toast.error(errorMessage);
    },
  });

  const handleApproveClick = (video: IVideoResume) => {
    setSelectedVideo(video);
    setApproveDialogOpen(true);
  };

  const handleRejectClick = (video: IVideoResume) => {
    setSelectedVideo(video);
    setRejectDialogOpen(true);
  };

  const handleViewVideo = (video: IVideoResume) => {
    setSelectedVideo(video);
    setVideoDialogOpen(true);
  };

  const handleApproveConfirm = () => {
    if (selectedVideo) {
      approveMutation.mutate(selectedVideo.id);
    }
  };

  const handleRejectConfirm = () => {
    if (!selectedVideo) return;

    if (!rejectionReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    rejectMutation.mutate({
      profileId: selectedVideo.id,
      reason: rejectionReason.trim(),
    });
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
    const firstName = video.firstName || '';
    const lastName = video.lastName || '';
    const name = `${firstName} ${lastName}`.trim();
    return name || 'N/A';
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
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
        <p className="text-muted-foreground mt-2">Review and moderate candidate video resumes</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video Resumes</CardTitle>
          <CardDescription>{data?.meta?.total || 0} total video resume(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading video resumes...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              Failed to load video resumes. Please try again.
            </div>
          ) : !data?.data || data.data.length === 0 ? (
            <div className="text-center py-12">
              <Video className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No video resumes found</p>
              <p className="text-sm text-muted-foreground">
                Video resumes will appear here when candidates upload them
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
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
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{getCandidateName(video)}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {video.userId.substring(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(video.videoProfileStatus)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(video.videoUploadedAt)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate text-sm text-muted-foreground">
                          {video.videoRejectionReason || '-'}
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
                          {(!video.videoProfileStatus ||
                            video.videoProfileStatus === 'pending') && (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleApproveClick(video)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleRejectClick(video)}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
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
              )}
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
              Are you sure you want to approve this video resume for{' '}
              <strong>{selectedVideo ? getCandidateName(selectedVideo) : ''}</strong>? This action
              will make the video visible to employers.
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

      {/* Reject Dialog with Reason */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Video Resume</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this video resume. The candidate will be
              notified with this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">
                Rejection Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="rejectionReason"
                placeholder="e.g., Video quality is too low, inappropriate content, etc."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
            {selectedVideo && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <div className="font-medium">Candidate Details:</div>
                <div className="text-muted-foreground mt-1">
                  Name: {getCandidateName(selectedVideo)}
                </div>
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
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Video Resume Preview</DialogTitle>
            <DialogDescription>Review the candidate's video resume</DialogDescription>
          </DialogHeader>
          {selectedVideo && (
            <div className="space-y-4">
              {/* Candidate Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Candidate Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Name</div>
                    <div className="font-medium">{getCandidateName(selectedVideo)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">User ID</div>
                    <div className="font-mono text-xs">{selectedVideo.userId}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div>{getStatusBadge(selectedVideo.videoProfileStatus)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Uploaded</div>
                    <div>{formatDate(selectedVideo.videoUploadedAt)}</div>
                  </div>
                  {selectedVideo.videoRejectionReason && (
                    <div className="col-span-2">
                      <div className="text-muted-foreground">Rejection Reason</div>
                      <div className="mt-1 p-2 bg-red-50 border border-red-200 rounded text-red-700">
                        {selectedVideo.videoRejectionReason}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Video Player */}
              <div className="aspect-video bg-black rounded-lg overflow-hidden">
                <video
                  controls
                  className="w-full h-full"
                  src={selectedVideo.videoUrl || selectedVideo.videoResumeUrl}
                >
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Action Buttons */}
              {(!selectedVideo.videoProfileStatus ||
                selectedVideo.videoProfileStatus === 'pending') && (
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="default"
                    onClick={() => {
                      setVideoDialogOpen(false);
                      handleApproveClick(selectedVideo);
                    }}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve
                  </Button>
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
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoResumeListPage;
