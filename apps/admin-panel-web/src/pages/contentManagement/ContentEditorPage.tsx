/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Eye, EyeOff } from 'lucide-react';
import axios from 'axios';
import config from '@/lib/config';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  metaTitle: string | null;
  metaDescription: string | null;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

interface ContentEditorPageProps {
  slug: string;
  pageTitle: string;
  pageDescription: string;
  icon: React.ReactNode;
}

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ color: [] }, { background: [] }],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    [{ align: [] }],
    ['blockquote'],
    ['link', 'image'],
    ['clean'],
  ],
};

const quillFormats = [
  'header',
  'bold',
  'italic',
  'underline',
  'strike',
  'color',
  'background',
  'list',
  'indent',
  'align',
  'blockquote',
  'link',
  'image',
];

export default function ContentEditorPage({
  slug,
  pageTitle,
  pageDescription,
  icon,
}: ContentEditorPageProps) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [existingPageId, setExistingPageId] = useState<string | null>(null);
  const [showSeo, setShowSeo] = useState(false);

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['cms-page', slug],
    queryFn: async () => {
      try {
        // Use axios directly to avoid http interceptor showing toast on 404
        const token = localStorage.getItem('token');
        const response = await axios.get(
          `${config.API_BASE_URL}${endpoints.contentManagement.getBySlug(slug)}`,
          { headers: token ? { Authorization: `Bearer ${token}` } : {} },
        );
        const data = response.data;
        return (data.data || data) as CmsPage;
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null;
        }
        throw error;
      }
    },
  });

  useEffect(() => {
    if (pageData) {
      setTitle(pageData.title || '');
      setContent(pageData.content || '');
      setMetaTitle(pageData.metaTitle || '');
      setMetaDescription(pageData.metaDescription || '');
      setIsPublished(pageData.status === 'published');
      setExistingPageId(pageData.id);
    }
  }, [pageData]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        slug,
        title: title.trim(),
        content,
        metaTitle: metaTitle.trim() || undefined,
        metaDescription: metaDescription.trim() || undefined,
        isPublished,
      };

      if (existingPageId) {
        return await http.put(endpoints.contentManagement.update(existingPageId), payload);
      } else {
        return await http.post(endpoints.contentManagement.create, payload);
      }
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['cms-page', slug] });
      if (!existingPageId && response?.id) {
        setExistingPageId(response.id);
      } else if (!existingPageId && response?.data?.id) {
        setExistingPageId(response.data.id);
      }
      toast.success('Page saved successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to save page');
    },
  });

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }
    if (!content.trim() || content === '<p><br></p>') {
      toast.error('Content is required');
      return;
    }
    saveMutation.mutate();
  };

  const hasChanges = useMemo(() => {
    if (!pageData)
      return title.trim() !== '' || (content.trim() !== '' && content !== '<p><br></p>');
    return (
      title !== (pageData.title || '') ||
      content !== (pageData.content || '') ||
      metaTitle !== (pageData.metaTitle || '') ||
      metaDescription !== (pageData.metaDescription || '') ||
      isPublished !== (pageData.status === 'published')
    );
  }, [pageData, title, content, metaTitle, metaDescription, isPublished]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">{icon}</div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
            <p className="text-muted-foreground">{pageDescription}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {isPublished ? (
              <Eye className="h-4 w-4 text-green-600" />
            ) : (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            )}
            <Label htmlFor="publish-toggle" className="text-sm">
              {isPublished ? 'Published' : 'Draft'}
            </Label>
            <Switch id="publish-toggle" checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
          <Button onClick={handleSave} disabled={saveMutation.isPending || !hasChanges}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {existingPageId ? 'Update Page' : 'Create Page'}
          </Button>
        </div>
      </div>

      {/* Title */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Page Title</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Enter page title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Content Editor */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Content</CardTitle>
          <CardDescription>
            Use the toolbar to format text, add headings, lists, links, and images
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="min-h-[400px] [&_.ql-container]:min-h-[350px] [&_.ql-editor]:min-h-[350px]">
            <ReactQuill
              theme="snow"
              value={content}
              onChange={setContent}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Start writing content..."
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">SEO Settings</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setShowSeo(!showSeo)}>
              {showSeo ? 'Hide' : 'Show'}
            </Button>
          </div>
        </CardHeader>
        {showSeo && (
          <CardContent className="space-y-4">
            <Separator className="mb-4" />
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input
                placeholder="SEO title (appears in browser tab and search results)"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {metaTitle.length}/60 characters recommended
              </p>
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Input
                placeholder="Brief description for search engines"
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {metaDescription.length}/160 characters recommended
              </p>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Status Info */}
      {pageData && (
        <p className="text-xs text-muted-foreground text-right">
          Last updated: {new Date(pageData.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
