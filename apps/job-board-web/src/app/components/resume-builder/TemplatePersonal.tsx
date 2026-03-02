import { ITemplateStructuredData } from '@/app/types/types';

type Props = {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
};

const TemplatePersonal = ({}: Props) => {
  return <div>TemplatePersonal</div>;
};

export default TemplatePersonal;
