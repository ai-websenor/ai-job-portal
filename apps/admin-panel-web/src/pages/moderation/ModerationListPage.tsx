import { useState } from 'react';
import { useModerationStore } from '@/stores/moderationStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { Trash2, Shield, Eye, Flag, Clock, CheckCircle } from 'lucide-react';

export default function PostModeration() {
  const { flaggedPosts, deletePost, unflagPost, markAsReviewed, getPendingCount } = useModerationStore();
  const [selectedTab, setSelectedTab] = useState('pending');

  const pendingPosts = flaggedPosts.filter(post => post.status === 'pending');
  const reviewedPosts = flaggedPosts.filter(post => post.status === 'reviewed');
  const pendingCount = getPendingCount();

  const handleDeletePost = (postId: string, title: string) => {
    deletePost(postId);
    toast({
      title: 'Post Deleted',
      description: `"${title}" has been permanently deleted.`,
    });
  };

  const handleUnflagPost = (postId: string, title: string) => {
    unflagPost(postId);
    toast({
      title: 'Post Unflagged',
      description: `"${title}" has been unflagged and restored.`,
    });
  };

  const handleMarkReviewed = (postId: string, title: string) => {
    markAsReviewed(postId);
    toast({
      title: 'Post Marked as Reviewed',
      description: `"${title}" has been marked as reviewed.`,
    });
  };

  const PostCard = ({ post, showActions = true }: { post: any, showActions?: boolean }) => (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{post.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>By: {post.author}</span>
              <span>•</span>
              <span>{post.authorEmail}</span>
              <span>•</span>
              <Badge variant="outline">{post.category}</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Flag className="h-4 w-4 text-red-500" />
              <span>Flagged for: {post.flaggedReason}</span>
              <span>•</span>
              <span>Flagged by: {post.flaggedBy}</span>
              <span>•</span>
              <span>{post.flaggedAt.toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={post.status === 'pending' ? 'destructive' : 'secondary'}>
              {post.status === 'pending' ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </>
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Reviewed
                </>
              )}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">Post Content:</p>
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">{post.content}</p>
          </div>
        </div>
        
        {showActions && (
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Post</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to permanently delete this post? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeletePost(post.id, post.title)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button variant="outline" size="sm" onClick={() => handleUnflagPost(post.id, post.title)}>
              <Shield className="h-4 w-4 mr-2" />
              Unflag Post
            </Button>

            {post.status === 'pending' && (
              <Button variant="secondary" size="sm" onClick={() => handleMarkReviewed(post.id, post.title)}>
                <Eye className="h-4 w-4 mr-2" />
                Mark as Reviewed
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto py-6 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Post Moderation</h1>
        <p className="text-muted-foreground">
          Review and manage flagged posts from the community
        </p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending" className="relative">
            Pending Review
            {pendingCount > 0 && (
              <Badge variant="destructive" className="ml-2 px-1.5 py-0.5 text-xs">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Pending Review ({pendingPosts.length})</h2>
            <p className="text-sm text-muted-foreground">
              Posts flagged by users that require administrator review
            </p>
          </div>
          
          {pendingPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-medium mb-2">No Pending Posts</h3>
                <p className="text-muted-foreground">
                  Great! There are no posts pending review at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {pendingPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="mt-6">
          <div className="mb-4">
            <h2 className="text-xl font-semibold mb-2">Reviewed Posts ({reviewedPosts.length})</h2>
            <p className="text-sm text-muted-foreground">
              Posts that have been reviewed by administrators
            </p>
          </div>
          
          {reviewedPosts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Eye className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Reviewed Posts</h3>
                <p className="text-muted-foreground">
                  Reviewed posts will appear here once you start moderating content.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div>
              {reviewedPosts.map((post) => (
                <PostCard key={post.id} post={post} showActions={false} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}