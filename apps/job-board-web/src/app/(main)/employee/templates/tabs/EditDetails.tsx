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
  const sections = [
    {
      key: 'personal',
      title: 'Personal Details',
      Component: TemplatePersonal,
      count: null,
    },
    {
      key: 'education',
      title: 'Education Details',
      Component: TemplateEducation,
      count: form?.educationalDetails?.length,
    },
    {
      key: 'experience',
      title: 'Work Experience',
      Component: TemplateWorkExperience,
      count: form?.experienceDetails?.length,
    },
    {
      key: 'skills',
      title: 'Key Skills',
      Component: TemplateSkills,
      count: form?.skills?.length,
    },
    {
      key: 'certifications',
      title: 'Certifications',
      Component: TemplateCertifications,
      count: form?.certifications?.length,
    },
  ];

  return (
    <Card shadow="none">
      <CardBody>
        <Accordion>
          {sections.map(({ key, title, Component, count }) => (
            <AccordionItem
              key={key}
              aria-label={title}
              title={
                <div className="flex items-center gap-2">
                  <span>{title}</span>
                  {count !== null && <Badge count={count ?? 0} />}
                </div>
              }
            >
              <Component form={form} setForm={setForm} />
            </AccordionItem>
          ))}
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
