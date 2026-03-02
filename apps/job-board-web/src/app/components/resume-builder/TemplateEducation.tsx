import { ITemplateStructuredData } from '@/app/types/types';
import EducationCard from '../cards/EducationCard';
import { useEffect, useState } from 'react';
import { Button, Checkbox, DatePicker, Input, Select, SelectItem } from '@heroui/react';
import { MdAdd } from 'react-icons/md';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import { getLocalTimeZone, today } from '@internationalized/date';
import dayjs from 'dayjs';

type Props = {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
};

const TemplateEducation = ({ form, setForm }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [degrees, setDegrees] = useState<any>([]);
  const [newEducation, setNewEducation] = useState<any>(null);
  const [fieldsOfStudies, setFieldsOfStudies] = useState<any>([]);

  const getDegrees = async () => {
    try {
      const response = await http.get(ENDPOINTS.MASTER_DATA.DEGRESS);
      if (response?.data?.length > 0) {
        setDegrees(
          response?.data?.map((degree: any) => ({
            id: degree?.id,
            label: degree?.name,
          })),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getFieldsOfStudies = async (degreeId: string) => {
    try {
      const response = await http.get(ENDPOINTS.MASTER_DATA.FIELDS_OF_STUDY(degreeId));
      if (response?.data?.length > 0) {
        setFieldsOfStudies(
          response?.data?.map((study: any) => ({
            id: study?.id,
            label: study?.name,
          })),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getDegrees();
  }, []);

  const handleChange = (name: string, value: any) => {
    setNewEducation({
      ...newEducation,
      [name]: value,
    });
  };

  const handleRemove = (index: number) => {
    const updatedEducationalDetails = [...(form?.educationalDetails || [])];
    updatedEducationalDetails.splice(index, 1);
    setForm({
      ...form,
      educationalDetails: updatedEducationalDetails,
    } as any);
  };

  const onSubmit = () => {
    const payload = {
      ...newEducation,
      startDate: dayjs(newEducation?.startDate).format('YYYY-MM-DD'),
      endDate: dayjs(newEducation?.endDate).format('YYYY-MM-DD'),
    };
    setForm({
      ...form,
      educationalDetails: [...(form?.educationalDetails || []), payload],
    } as any);
    setShowForm(false);
    setNewEducation(null);
  };

  return (
    <div>
      {!showForm && form && form?.educationalDetails?.length > 0 ? (
        <div className="grid gap-5">
          {form?.educationalDetails?.map((record, index) => (
            <EducationCard
              key={record?.id}
              education={record}
              onDelete={() => handleRemove(index)}
            />
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
                  degree: degrees,
                  fieldOfStudy: fieldsOfStudies,
                };

                return (
                  <Select
                    label={field.label}
                    placeholder={field.placeholder}
                    size="lg"
                    onSelectionChange={(ev) => handleChange(field.name, ev)}
                  >
                    {(optionsMap?.[field?.name] || []).map((option: any) => (
                      <SelectItem
                        key={option?.label}
                        onPress={() => {
                          if (field?.name === 'degree') {
                            getFieldsOfStudies(option.id);
                          }
                        }}
                      >
                        {option?.label}
                      </SelectItem>
                    ))}
                  </Select>
                );
              }

              if (field?.type === 'date') {
                return (
                  <DatePicker
                    onChange={(ev) => handleChange(field?.name, ev)}
                    label={field.label}
                    size="md"
                    maxValue={today(getLocalTimeZone())}
                  />
                );
              }

              if (field?.type === 'checkbox') {
                return (
                  <Checkbox
                    placeholder={field.placeholder}
                    size="md"
                    onChange={(e) => handleChange(field?.name, e.target.checked)}
                  >
                    {field?.label}
                  </Checkbox>
                );
              }

              if (field?.type === 'text') {
                return (
                  <Input
                    key={field?.name}
                    name={field?.name}
                    label={field?.label}
                    placeholder={field?.placeholder}
                    onChange={(e) => handleChange(field?.name, e.target.value)}
                  />
                );
              }
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

export default TemplateEducation;

const fields = [
  {
    name: 'degree',
    type: 'select',
    label: 'Degree',
    placeholder: 'Example degree',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'institution',
    type: 'text',
    label: 'Institution Name',
    placeholder: 'Enter institution name',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'fieldOfStudy',
    type: 'select',
    label: 'Field of Study',
    placeholder: 'Enter field of study',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'startDate',
    type: 'date',
    label: 'Start Date',
    placeholder: 'Enter start date',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'endDate',
    type: 'date',
    label: 'End Date',
    placeholder: 'Enter end date',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'grade',
    type: 'text',
    label: 'Grade',
    placeholder: 'e.g. A, 3.8 GPA',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'honors',
    type: 'text',
    label: 'Honors',
    placeholder: "e.g. Honor Roll, Dean's List",
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'description',
    type: 'textarea',
    label: 'Description',
    placeholder: 'Additional details about your education',
    isDisabled: false,
    isRequired: false,
  },
  {
    name: 'currentlyStudying',
    type: 'checkbox',
    label: 'Currently Studying',
    placeholder: '',
    isDisabled: false,
    isRequired: false,
  },
];
