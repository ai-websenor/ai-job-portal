import { ITemplateStructuredData } from '@/app/types/types';
import { Button, Checkbox, Input, Select, SelectItem } from '@heroui/react';
import { useEffect, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import SkillCard from '../cards/SkillCard';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { ProficiencyLevel } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';

type Props = {
  form: ITemplateStructuredData | null;
  setForm: (val: ITemplateStructuredData) => void;
};

const TemplateSkills = ({ form, setForm }: Props) => {
  const [showForm, setShowForm] = useState(false);
  const [newSkill, setNewSkill] = useState<any>(null);
  const [skillOptions, setSkillOptions] = useState<any>([]);

  const getSkillOptions = async () => {
    try {
      const response = await http.get(ENDPOINTS.MASTER_DATA.SKILLS);
      if (response?.data?.length > 0) {
        setSkillOptions(response?.data?.map((study: any) => study?.name));
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getSkillOptions();
  }, []);

  const handleChange = (name: string, value: any) => {
    setNewSkill({
      ...newSkill,
      [name]: value,
    });
  };

  const handleRemove = (index: number) => {
    const updateSkills = [...(form?.skills || [])];
    updateSkills.splice(index, 1);
    setForm({
      ...form,
      skills: updateSkills,
    } as any);
  };

  const onSubmit = () => {
    if (Object.keys(newSkill).length === 0) {
      alert('Please fill in all fields before submitting.');
      return;
    }

    setForm({
      ...form,
      skills: [...(form?.skills || []), newSkill],
    } as any);
    setNewSkill(null);
    setShowForm(false);
  };

  return (
    <div>
      {!showForm && form && form?.skills?.length > 0 ? (
        <div className="grid gap-5">
          {form?.skills?.map((record: any, index) => (
            <SkillCard
              key={record?.id}
              experience={record?.yearsOfExperience}
              id={record?.skillId}
              proficiencyLevel={record?.proficiencyLevel}
              skillName={record?.name}
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
                  name: skillOptions,
                  proficiencyLevel: Object.values(ProficiencyLevel),
                };

                return (
                  <Select
                    label={field.label}
                    placeholder={field.placeholder}
                    onSelectionChange={(ev) => handleChange(field.name, ev.anchorKey)}
                  >
                    {(optionsMap?.[field?.name] || []).map((option: any) => (
                      <SelectItem key={option}>{CommonUtils.keyIntoTitle(option)}</SelectItem>
                    ))}
                  </Select>
                );
              }

              if (field?.type === 'text' || field?.type === 'number') {
                return (
                  <Input
                    key={field?.name}
                    type={field?.type}
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

export default TemplateSkills;

const fields = [
  {
    name: 'name',
    type: 'select',
    label: 'Skill Name',
    placeholder: 'Ex: React Native',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'proficiencyLevel',
    type: 'select',
    label: 'Proficiency Level',
    placeholder: 'Enter proficiency level',
    isDisabled: false,
    isRequired: true,
  },
  {
    name: 'experience',
    type: 'number',
    label: 'Years of Experience',
    placeholder: 'Ex: 2',
    isDisabled: false,
    isRequired: false,
  },
];
