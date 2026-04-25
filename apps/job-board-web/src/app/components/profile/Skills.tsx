'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { ProfileEditProps } from '@/app/types/types';
import {
  addToast,
  Autocomplete,
  AutocompleteItem,
  Button,
  Input,
  Select,
  SelectItem,
} from '@heroui/react';
import { useEffect, useState } from 'react';
import { MdAdd } from 'react-icons/md';
import SkillCard from '../cards/SkillCard';
import CommonUtils from '@/app/utils/commonUtils';
import { Controller } from 'react-hook-form';
import { ProficiencyLevel } from '@/app/types/enum';
import LoadingProgress from '../lib/LoadingProgress';

const Skills = ({ errors, control, isSubmitting, handleSubmit, setValue }: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [skillOptions, setSkillOptions] = useState<any>([]);
  const [profileSkills, setProfileSkills] = useState<any[]>([]);

  const toggleForm = () => {
    setShowForm(!showForm);
    if (showForm) {
      setEditingId(null);
    }
  };

  const onEdit = (record: any) => {
    setShowForm(true);
    setEditingId(record?.skillId);
    setTimeout(() => {
      setValue?.('skillName', record?.skill?.name, { shouldValidate: true, shouldDirty: true });
      setValue?.('proficiencyLevel', record?.proficiencyLevel, {
        shouldValidate: true,
        shouldDirty: true,
      });
    }, 0);
  };

  const getSkills = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.CANDIDATE.PROFILE_SKILLS);
      setProfileSkills(response?.data);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

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
    getSkills();
  }, []);

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key)));

    try {
      setLoading(true);
      if (editingId) {
        await http.put(ENDPOINTS.CANDIDATE.UPDATE_SKILLS(editingId), {
          ...payload,
        });
      } else {
        await http.post(ENDPOINTS.CANDIDATE.ADD_SKILL, {
          ...payload,
          yearsOfExperience: payload.yearsofexperience,
        });
      }
      getSkills();
      addToast({
        color: 'success',
        title: 'Success',
        description: `Skill ${editingId ? 'updated' : 'added'} successfully`,
      });
      setShowForm(false);
      setEditingId(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('updateProfile'));
      }
      toggleForm();
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Skills</h1>
      {loading ? (
        <LoadingProgress />
      ) : !showForm ? (
        <div className="grid gap-5">
          {profileSkills?.map((record: any) => (
            <SkillCard
              key={record?.skillId}
              id={record?.skillId}
              refetch={getSkills}
              skillName={record?.skill?.name}
              yearsOfExperience={record?.yearsOfExperience}
              proficiencyLevel={record?.proficiencyLevel}
              onEdit={() => onEdit(record)}
            />
          ))}

          <Button
            size="md"
            fullWidth
            color="default"
            className="mt-3"
            startContent={<MdAdd />}
            onPress={() => {
              setEditingId(null);
              setShowForm(true);
              setTimeout(() => {
                fields.forEach((field) => setValue?.(field.name as any, ''));
              }, 0);
            }}
          >
            Add more
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-5 sm:grid-cols-2">
            {fields?.map((field) => {
              const fieldError = errors[field.name];

              return (
                <Controller
                  key={field.name}
                  control={control}
                  name={field.name}
                  render={({ field: inputProps }) => {
                    if (field.name === 'skillName') {
                      const filteredItems =
                        skillOptions
                          ?.filter((name: string) =>
                            name.toLowerCase().includes((inputProps.value || '').toLowerCase()),
                          )
                          .map((name: string) => ({ label: name, value: name })) || [];

                      return (
                        <Autocomplete
                          {...inputProps}
                          label={field.label}
                          placeholder={field.placeholder}
                          labelPlacement="outside"
                          size="lg"
                          className="mb-4"
                          isInvalid={!!fieldError}
                          errorMessage={fieldError?.message as string}
                          allowsCustomValue
                          items={filteredItems}
                          inputValue={inputProps.value || ''}
                          onInputChange={(val) => inputProps.onChange(val)}
                          onSelectionChange={(key) => {
                            if (key) inputProps.onChange(key);
                          }}
                        >
                          {(item: any) => (
                            <AutocompleteItem key={item.value} textValue={item.label}>
                              {item.label}
                            </AutocompleteItem>
                          )}
                        </Autocomplete>
                      );
                    }

                    if (field?.type === 'select' && field?.name !== 'skillName') {
                      const optionsMap: Record<string, any[]> = {
                        skillName: skillOptions,
                        proficiencyLevel: Object.values(ProficiencyLevel),
                      };

                      return (
                        <Select
                          {...inputProps}
                          label={field.label}
                          placeholder={field.placeholder}
                          labelPlacement="outside"
                          size="lg"
                          className="mb-4"
                          isInvalid={!!fieldError}
                          errorMessage={fieldError?.message}
                          selectedKeys={new Set([inputProps.value])}
                        >
                          {optionsMap[field.name]?.map((option: string) => (
                            <SelectItem key={option}>{CommonUtils.keyIntoTitle(option)}</SelectItem>
                          ))}
                        </Select>
                      );
                    }

                    return (
                      <Input
                        {...inputProps}
                        type={field.type}
                        label={field.label}
                        placeholder={field.placeholder}
                        labelPlacement="outside"
                        size="lg"
                        className="mb-4"
                        isInvalid={!!fieldError}
                        errorMessage={fieldError?.message}
                      />
                    );
                  }}
                />
              );
            })}
          </div>

          <div className="mt-10 flex gap-3 justify-end">
            <Button size="md" onPress={toggleForm}>
              Cancel
            </Button>
            <Button color="primary" size="md" type="submit" isLoading={isSubmitting}>
              Save
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Skills;

const fields = [
  {
    name: 'skillName',
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
    name: 'yearsOfExperience',
    type: 'number',
    label: 'Experience',
    placeholder: 'Ex. 2.5',
    isDisabled: false,
    isRequired: true,
  },
];
