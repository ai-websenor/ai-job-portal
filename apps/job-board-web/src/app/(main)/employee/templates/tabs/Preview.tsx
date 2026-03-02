import { ITemplateRenderConfig, ITemplateStructuredData } from '@/app/types/types';

type Props = {
  data: ITemplateStructuredData;
  renderedHtml: string;
  renderConfig: ITemplateRenderConfig;
};

const Preview = ({ data, renderedHtml, renderConfig }: Props) => {
  return <div>Preview</div>;
};

export default Preview;
