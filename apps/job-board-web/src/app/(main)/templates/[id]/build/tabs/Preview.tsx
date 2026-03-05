import { ITemplateRenderConfig, ITemplateStructuredData } from '@/app/types/types';
import { generateFullHtml } from '@/app/utils/resume-renderer';
import { useEffect, useMemo, useRef, useState } from 'react';

type Props = {
  data: ITemplateStructuredData;
  templateHtml?: string;
  templateCss?: string;
  renderConfig: ITemplateRenderConfig;
};

const DEBOUNCE_MS = 300;

const Preview = ({ data, templateHtml, templateCss, renderConfig }: Props) => {
  const fullHtml = useMemo(() => {
    if (!templateHtml) return '';
    return generateFullHtml(templateHtml, templateCss || '', data, renderConfig);
  }, [templateHtml, templateCss, data, renderConfig]);

  const [debouncedHtml, setDebouncedHtml] = useState(fullHtml);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      setDebouncedHtml(fullHtml);
      isFirstRender.current = false;
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedHtml(fullHtml);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [fullHtml]);

  if (!templateHtml) return null;

  return (
    <div className="w-full  bg-slate-50 rounded-2xl overflow-y-auto border border-slate-200 p-8 flex justify-center scrollbar-hide shadow-inner">
      <div className="relative w-[210mm] min-h-[297mm] h-fit bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] origin-top transition-all duration-300 hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.2)] rounded-sm overflow-hidden border">
        <iframe
          title="Resume Preview"
          srcDoc={debouncedHtml}
          className="w-full border-none pointer-events-none"
          style={{ height: '297mm', width: '210mm' }}
          scrolling="no"
        />
      </div>
    </div>
  );
};

export default Preview;
