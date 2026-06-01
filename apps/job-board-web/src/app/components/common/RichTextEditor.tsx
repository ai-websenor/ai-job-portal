'use client';

import Link from '@tiptap/extension-link';
import { Table, TableCell, TableHeader, TableRow } from '@tiptap/extension-table';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Button, Tooltip } from '@heroui/react';
import clsx from 'clsx';
import { useEffect, useMemo, type ReactNode } from 'react';
import {
  MdFormatAlignCenter,
  MdFormatAlignLeft,
  MdFormatAlignRight,
  MdFormatBold,
  MdFormatClear,
  MdFormatItalic,
  MdFormatListBulleted,
  MdFormatListNumbered,
  MdFormatUnderlined,
  MdLink,
  MdLooks3,
  MdLooksTwo,
  MdTableChart,
} from 'react-icons/md';

type RichTextEditorProps = {
  value?: string | null;
  onChange: (html: string) => void;
  label?: ReactNode;
  placeholder?: string;
  isInvalid?: boolean;
  errorMessage?: ReactNode;
  className?: string;
};

type ToolbarButtonProps = {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  isActive?: boolean;
  isDisabled?: boolean;
};

const supportedStyleProps = new Set([
  'font-style',
  'font-weight',
  'text-align',
  'text-decoration',
  'vertical-align',
]);

const cleanStyleAttribute = (style: string) =>
  style
    .split(';')
    .map((rule) => rule.trim())
    .filter(Boolean)
    .filter((rule) => {
      const [rawProperty, ...rawValue] = rule.split(':');
      const property = rawProperty?.trim().toLowerCase();
      const value = rawValue.join(':').trim().toLowerCase();

      return (
        supportedStyleProps.has(property) &&
        !!value &&
        !value.includes('mso-') &&
        !value.includes('expression') &&
        !value.includes('url(')
      );
    })
    .join('; ');

const cleanPastedHTML = (html: string) =>
  html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?o:p[^>]*>/gi, '')
    .replace(/\s*mso-[^:]+:[^;"']+;?/gi, '')
    .replace(/\s*class=(["'])?Mso[^"'\s>]*\1?/gi, '')
    .replace(/\s*lang=(["'])?[^"'\s>]*\1?/gi, '')
    .replace(/\s*style=(["'])(.*?)\1/gi, (_match, quote: string, styles: string) => {
      const cleanStyles = cleanStyleAttribute(styles);
      return cleanStyles ? ` style=${quote}${cleanStyles}${quote}` : '';
    })
    .replace(/<span[^>]*>\s*<\/span>/gi, '');

const editorSurfaceClassName =
  'prose max-w-none min-h-[12rem] px-3 py-3 text-sm leading-relaxed text-gray-700 outline-none prose-table:my-3 prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-gray-200 prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2 prose-td:align-top prose-a:text-primary';

const ToolbarButton = ({ label, icon, onPress, isActive, isDisabled }: ToolbarButtonProps) => (
  <Tooltip content={label} placement="top">
    <Button
      isIconOnly
      size="sm"
      variant={isActive ? 'solid' : 'bordered'}
      color={isActive ? 'primary' : 'default'}
      className="h-8 min-w-8 rounded-lg border-default-200"
      onPress={onPress}
      isDisabled={isDisabled}
      aria-label={label}
    >
      {icon}
    </Button>
  </Tooltip>
);

const normalizeLink = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(javascript|data):/i.test(trimmed)) return '';
  if (/^(https?:|mailto:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const setLink = (editor: Editor) => {
  const previousUrl = editor.getAttributes('link').href as string | undefined;
  const nextUrl = window.prompt('Enter URL', previousUrl || 'https://');

  if (nextUrl === null) return;

  const href = normalizeLink(nextUrl);
  if (!href) {
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    return;
  }

  editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
};

export function RichTextEditor({
  value,
  onChange,
  label,
  placeholder,
  isInvalid,
  errorMessage,
  className,
}: RichTextEditorProps) {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
      }),
      Underline,
      Link.configure({
        autolink: true,
        defaultProtocol: 'https',
        openOnClick: false,
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions,
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: editorSurfaceClassName,
        'aria-label': typeof label === 'string' ? label : 'Rich text editor',
      },
      transformPastedHTML: cleanPastedHTML,
    },
  });

  useEffect(() => {
    if (!editor) return;

    const nextValue = value || '';
    if (nextValue === editor.getHTML()) return;

    editor.commands.setContent(nextValue, { emitUpdate: false });
  }, [editor, value]);

  const hasEditor = !!editor;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}

      <div
        className={clsx(
          'rounded-2xl border bg-white transition-colors focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20',
          isInvalid ? 'border-danger' : 'border-default-200',
        )}
      >
        <div className="flex flex-wrap gap-1.5 border-b border-default-200 bg-default-50/70 px-2 py-2">
          <ToolbarButton
            label="Bold"
            icon={<MdFormatBold size={18} />}
            onPress={() => editor?.chain().focus().toggleBold().run()}
            isActive={editor?.isActive('bold')}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Italic"
            icon={<MdFormatItalic size={18} />}
            onPress={() => editor?.chain().focus().toggleItalic().run()}
            isActive={editor?.isActive('italic')}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Underline"
            icon={<MdFormatUnderlined size={18} />}
            onPress={() => editor?.chain().focus().toggleUnderline().run()}
            isActive={editor?.isActive('underline')}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Heading 2"
            icon={<MdLooksTwo size={18} />}
            onPress={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor?.isActive('heading', { level: 2 })}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Heading 3"
            icon={<MdLooks3 size={18} />}
            onPress={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            isActive={editor?.isActive('heading', { level: 3 })}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Bullet list"
            icon={<MdFormatListBulleted size={18} />}
            onPress={() => editor?.chain().focus().toggleBulletList().run()}
            isActive={editor?.isActive('bulletList')}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Numbered list"
            icon={<MdFormatListNumbered size={18} />}
            onPress={() => editor?.chain().focus().toggleOrderedList().run()}
            isActive={editor?.isActive('orderedList')}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Align left"
            icon={<MdFormatAlignLeft size={18} />}
            onPress={() => editor?.chain().focus().setTextAlign('left').run()}
            isActive={editor?.isActive({ textAlign: 'left' })}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Align center"
            icon={<MdFormatAlignCenter size={18} />}
            onPress={() => editor?.chain().focus().setTextAlign('center').run()}
            isActive={editor?.isActive({ textAlign: 'center' })}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Align right"
            icon={<MdFormatAlignRight size={18} />}
            onPress={() => editor?.chain().focus().setTextAlign('right').run()}
            isActive={editor?.isActive({ textAlign: 'right' })}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Insert table"
            icon={<MdTableChart size={18} />}
            onPress={() =>
              editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Link"
            icon={<MdLink size={18} />}
            onPress={() => editor && setLink(editor)}
            isActive={editor?.isActive('link')}
            isDisabled={!hasEditor}
          />
          <ToolbarButton
            label="Clear formatting"
            icon={<MdFormatClear size={18} />}
            onPress={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
            isDisabled={!hasEditor}
          />
        </div>

        <div className="overflow-x-auto">
          {!editor && (
            <div className="min-h-[12rem] px-3 py-3 text-sm text-default-400">
              {placeholder || 'Enter content'}
            </div>
          )}
          <EditorContent editor={editor} />
        </div>
      </div>

      {isInvalid && errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
    </div>
  );
}
