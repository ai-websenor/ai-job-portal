import TemplateCertifications from '@/app/components/resume-builder/TemplateCertifications';
import TemplateEducation from '@/app/components/resume-builder/TemplateEducation';
import TemplatePersonal from '@/app/components/resume-builder/TemplatePersonal';
import TemplateSkills from '@/app/components/resume-builder/TemplateSkills';
import TemplateWorkExperience from '@/app/components/resume-builder/TemplateWorkExperience';
import { ITemplateStructuredData } from '@/app/types/types';
import { Accordion, AccordionItem, Card, CardBody } from '@heroui/react';

interface Props {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
}

const EditDetails = ({ form, setForm }: Props) => {
  return (
    <Card shadow="none">
      <CardBody>
        <Accordion>
          <AccordionItem key="1" title="Personal Details">
            <TemplatePersonal form={form} setForm={setForm} />
          </AccordionItem>
          <AccordionItem
            key="2"
            title={
              <div className="flex items-center gap-2">
                <span>Education Details</span>
                <Badge count={form?.educationalDetails?.length ?? 0} />
              </div>
            }
          >
            <TemplateEducation form={form} setForm={setForm} />
          </AccordionItem>
          <AccordionItem
            key="3"
            title={
              <div className="flex items-center gap-2">
                <span>Work Experience</span>
                <Badge count={form?.experienceDetails?.length ?? 0} />
              </div>
            }
          >
            <TemplateWorkExperience form={form} setForm={setForm} />
          </AccordionItem>
          <AccordionItem
            key="4"
            title={
              <div className="flex items-center gap-2">
                <span>Key Skills</span>
                <Badge count={form?.skills?.length ?? 0} />
              </div>
            }
          >
            <TemplateSkills form={form} setForm={setForm} />
          </AccordionItem>
          <AccordionItem
            key="5"
            title={
              <div className="flex items-center gap-2">
                <span>Certifications</span>
                <Badge count={form?.certifications?.length ?? 0} />
              </div>
            }
          >
            <TemplateCertifications form={form} setForm={setForm} />
          </AccordionItem>
        </Accordion>
      </CardBody>
    </Card>
  );
};

export default EditDetails;

const Badge = ({ count }: { count: number }) => {
  return (
    <span className="bg-primary text-sm text-white font-medium h-2 w-2 rounded-full p-2 flex items-center justify-center">
      {count}
    </span>
  );
};
