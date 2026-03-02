import Certifications from '@/app/(auth)/auth/onboarding/steps/Certifications';
import { ITemplateStructuredData } from '@/app/types/types';
import { Button, DatePicker, Input } from '@heroui/react';
import { useState } from 'react';
import { MdAdd } from 'react-icons/md';
import CertificationCard from '../cards/CertificationCard';
import { getLocalTimeZone, today } from '@internationalized/date';

type Props = {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
};

const TemplateCertifications = ({ form, setForm }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [newCertificate, setNewCertificate] = useState<any>(null);

  const handleChange = (name: string, value: any) => {
    setNewCertificate({
      ...newCertificate,
      [name]: value,
    });
  };

  const handleRemove = (index: number) => {
    const updateCertifications = [...(form?.certifications || [])];
    updateCertifications.splice(index, 1);
    setForm({
      ...form,
      certifications: updateCertifications,
    } as any);
  };

  const onSubmit = () => {
    const payload = {
      ...newCertificate,
      // ...(newCertificate?.startDate &&
      //   newCertificate?.endDate && {
      //     startDate: dayjs(newCertificate?.startDate).toISOString(),
      //     endDate: dayjs(newCertificate?.endDate).toISOString(),
      //   }),
    };

    if (Object.keys(payload).length === 0) {
      alert('Please fill in all fields before submitting.');
      return;
    }

    setForm({
      ...form,
      certifications: [...(form?.certifications || []), payload],
    } as any);
    setNewCertificate(null);
    setShowForm(false);
  };

  return (
    <div>
      {!showForm && form && form?.certifications?.length > 0 ? (
        <div className="grid gap-5">
          {form?.certifications?.map((record: any, index: number) => (
            <CertificationCard key={record.id} {...record} onDelete={() => handleRemove(index)} />
          ))}

          <div className="mt-3 flex justify-end">
            <Button
              size="sm"
              className="font-medium"
              color="primary"
              variant="light"
              startContent={<MdAdd size={16} />}
              onPress={() => {
                setShowForm(true);
              }}
            >
              Add more
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <div className="grid gap-5 sm:grid-cols-3">
            {fields?.map((field) => {
              if (field?.type === 'date') {
                return (
                  <DatePicker
                    name={field.name}
                    label={field.label}
                    maxValue={today(getLocalTimeZone())}
                    onSelect={(ev) => handleChange(field.name, ev)}
                  />
                );
              }

              return (
                <Input
                  name={field.name}
                  type={field.type}
                  label={field.label}
                  placeholder={field.placeholder}
                  onChange={(ev) => handleChange(field.name, ev.target.value)}
                />
              );
            })}
          </div>

          <div className="mt-3 flex gap-3 items-center justify-end">
            <Button size="sm" color="default">
              Cancel
            </Button>
            <Button size="sm" color="primary" onPress={onSubmit}>
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplateCertifications;

const fields = [
  {
    name: 'name',
    type: 'text',
    label: 'Certificate Name',
    placeholder: 'e.g. Amazon Solutions Architect',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'issuingOrganization',
    type: 'text',
    label: 'Issuing Organization',
    placeholder: 'e.g. Amazon Web Services',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'issueDate',
    type: 'date',
    label: 'Issue Date',
    placeholder: 'e.g. 2022-01-01',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'expiryDate',
    type: 'date',
    label: 'Expiry Date',
    placeholder: 'e.g. 2022-01-01',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'credentialId',
    type: 'text',
    label: 'Credential ID',
    placeholder: 'e.g. AWS-123',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'credentialUrl',
    type: 'text',
    label: 'Credential URL',
    placeholder: 'e.g. https://www.amazon.com',
    isDisabled: false,
    isRequired: false,
  },
];
