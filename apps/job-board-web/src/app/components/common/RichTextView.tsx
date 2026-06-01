import clsx from 'clsx';
import DOMPurify from 'isomorphic-dompurify';

type RichTextViewProps = {
  html?: string | null;
  className?: string;
};

const richTextClassName =
  'prose max-w-none text-gray-700 whitespace-pre-wrap prose-p:whitespace-normal prose-li:whitespace-normal prose-td:whitespace-normal prose-table:my-3 prose-table:w-full prose-table:border-collapse prose-table:border prose-table:border-gray-200 prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-td:border prose-td:border-gray-200 prose-td:px-3 prose-td:py-2 prose-td:align-top prose-a:text-primary prose-a:no-underline hover:prose-a:underline';

export function RichTextView({ html, className }: RichTextViewProps) {
  if (!html) return null;

  const clean = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });

  return (
    <div className="overflow-x-auto">
      <div
        className={clsx(richTextClassName, className)}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    </div>
  );
}
