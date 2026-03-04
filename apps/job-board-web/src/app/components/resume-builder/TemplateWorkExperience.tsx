import { ITemplateStructuredData } from '@/app/types/types';
import { useState } from 'react';
import WorkExperienceCard from '../cards/WorkExperienceCard';
import { MdAdd } from 'react-icons/md';
import { Button, Checkbox, DatePicker, Input, Select, SelectItem, Textarea } from '@heroui/react';
import { employmentTypes } from '@/app/config/data';
import { getLocalTimeZone, today } from '@internationalized/date';
import dayjs from 'dayjs';

type Props = {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
};

const TemplateWorkExperience = ({ form, setForm }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [newExperience, setNewExperience] = useState<any>(null);

  const handleChange = (name: string, value: any) => {
    setNewExperience({
      ...newExperience,
      [name]: value,
    });
  };

  const handleRemove = (index: number) => {
    const updatedExperienceDetails = [...(form?.experienceDetails || [])];
    updatedExperienceDetails.splice(index, 1);
    setForm({
      ...form,
      experienceDetails: updatedExperienceDetails,
    } as any);
  };

  const onSubmit = () => {
    const payload = {
      ...newExperience,
      ...(newExperience?.startDate &&
        newExperience?.endDate && {
          startDate: dayjs(newExperience?.startDate).toISOString(),
          endDate: dayjs(newExperience?.endDate).toISOString(),
        }),
    };

    if (Object.keys(payload).length === 0) {
      alert('Please fill in all fields before submitting.');
      return;
    }

    setForm({
      ...form,
      experienceDetails: [...(form?.experienceDetails || []), payload],
    } as any);
    setNewExperience(null);
    setShowForm(false);
  };

  return (
    <div>
      {!showForm && form && form?.experienceDetails?.length > 0 ? (
        <div className="grid gap-5">
          {form?.experienceDetails?.map((record: any, index: number) => (
            <WorkExperienceCard key={record?.id} {...record} onDelete={() => handleRemove(index)} />
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
              if (field?.type === 'select') {
                const optionsMap: Record<string, any[]> = {
                  employmentType: employmentTypes,
                };

                return (
                  <Select
                    name={field.name}
                    label={field.label}
                    placeholder={field.placeholder}
                    onSelectionChange={(ev) => handleChange(field.name, ev.anchorKey)}
                  >
                    {optionsMap[field.name]?.map((option: any) => (
                      <SelectItem key={option?.key}>{option?.label}</SelectItem>
                    ))}
                  </Select>
                );
              }

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

              if (field?.type === 'checkbox') {
                return (
                  <Checkbox
                    name={field.name}
                    placeholder={field.placeholder}
                    size="md"
                    onChange={(ev) => handleChange(field.name, ev.target.checked)}
                  >
                    {field?.label}
                  </Checkbox>
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

            <Textarea
              name="description"
              label="Description"
              placeholder="Describe your role & achievements"
              minRows={6}
              onChange={(ev) => handleChange(ev.target.name, ev.target.value)}
            />

            <Textarea
              name="achievements"
              label="Achievements"
              placeholder="Key projects or achievements"
              minRows={6}
              onChange={(ev) => handleChange(ev.target.name, ev.target.value)}
            />
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

export default TemplateWorkExperience;

const fields = [
  {
    name: 'title',
    type: 'text',
    label: 'Job Title',
    placeholder: 'Enter job title',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'designation',
    type: 'text',
    label: 'Designation',
    placeholder: 'Ex: Lead Developer',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'companyName',
    type: 'text',
    label: 'Company Name',
    placeholder: 'Ex: Google',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'employmentType',
    type: 'select',
    label: 'Employment Type',
    placeholder: 'Ex: Full-time',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'location',
    type: 'text',
    label: 'Location',
    placeholder: 'Ex: San Francisco, CA',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'skillsUsed',
    type: 'text',
    label: 'Skills Used',
    placeholder: 'Skills used in this role',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: '',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: '',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'isCurrent',
    type: 'checkbox',
    label: "I'm currently working here",
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
