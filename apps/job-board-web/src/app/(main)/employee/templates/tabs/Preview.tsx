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
    <div className="w-full h-[calc(100vh-250px)] bg-gray-100 rounded-lg overflow-hidden border">
      <iframe title="Resume Preview" srcDoc={debouncedHtml} className="w-full h-full border-none" />
    </div>
  );
};

export default Preview;
