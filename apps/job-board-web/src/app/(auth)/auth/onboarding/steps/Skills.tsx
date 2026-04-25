'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import SkillCard from '@/app/components/cards/SkillCard';
import LoadingProgress from '@/app/components/lib/LoadingProgress';
import { ProficiencyLevel } from '@/app/types/enum';
import { OnboardingStepProps } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
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
import { Controller } from 'react-hook-form';
import { IoMdArrowForward } from 'react-icons/io';
import { MdAdd } from 'react-icons/md';

const Skills = ({
  control,
  errors,
  handleSubmit,
  handleNext,
  setValue,
  parsedRecords,
  onParsedSaved,
}: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [skillOptions, setSkillOptions] = useState<any>([]);
  const [profileSkills, setProfileSkills] = useState<any[]>([]);
  const [localParsed, setLocalParsed] = useState<any[]>([]);

  useEffect(() => {
    if (parsedRecords?.length) {
      setLocalParsed(
        parsedRecords.map((skill: any, i: number) => ({
          skillName: typeof skill === 'string' ? skill : skill.skillName,
          proficiencyLevel: skill.proficiencyLevel || 'intermediate',
          yearsOfExperience: skill.yearsOfExperience || null,
          _tempId: `parsed_skill_${i}`,
          _isParsed: true,
        })),
      );
    }
  }, []);

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

  const onEdit = (record: any) => {
    setEditingId(record?.skillId || record?._tempId);
    setValue?.('skillName', record?.skill?.name || record?.skillName);
    setValue?.('proficiencyLevel', record?.proficiencyLevel);
    setValue?.('yearsOfExperience', record?.yearsOfExperience);
    setShowForm(true);
  };

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);
    const payload = Object.fromEntries(Object.entries(data).filter(([key]) => keys.includes(key)));

    try {
      setLoading(true);
      if (editingId?.toString().startsWith('parsed_skill_')) {
        setLocalParsed((prev) =>
          prev.map((rec) =>
            rec._tempId === editingId
              ? {
                  ...rec,
                  skillName: payload.skillName,
                  proficiencyLevel: payload.proficiencyLevel,
                  yearsOfExperience: payload.yearsOfExperience,
                }
              : rec,
          ),
        );
      } else if (editingId) {
        await http.put(ENDPOINTS.CANDIDATE.UPDATE_SKILLS(editingId), {
          ...payload,
          yearsOfExperience: payload.yearsOfExperience,
        });
      } else {
        await http.post(ENDPOINTS.CANDIDATE.ADD_SKILL, {
          ...payload,
          yearsOfExperience: payload.yearsOfExperience,
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
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAllParsed = async () => {
    setLoading(true);
    try {
      if (profileSkills?.length > 0) {
        await Promise.all(
          profileSkills.map((rec: any) =>
            http
              .delete(ENDPOINTS.CANDIDATE.DELETE_SKILL(rec.skillId))
              .catch((e: unknown) => console.debug('[Skills] delete:', e)),
          ),
        );
      }
      const skills = localParsed.map((s: any) => ({
        skillName: s.skillName,
        proficiencyLevel: s.proficiencyLevel || 'intermediate',
        yearsOfExperience: s.yearsOfExperience || null,
        forceSave: true,
      }));
      await http.post(ENDPOINTS.CANDIDATE.BULK_ADD_SKILLS, { skills });
      setLocalParsed([]);
      onParsedSaved?.();
      getSkills();
      addToast({ color: 'success', title: 'Success', description: 'Skills saved successfully' });
    } catch (e) {
      console.debug('[Skills] save all error:', e);
    } finally {
      setLoading(false);
    }
    handleNext?.();
  };

  const allSkills = [...(profileSkills || []), ...localParsed];

  return !showForm && allSkills?.length > 0 ? (
    <div className="flex flex-col gap-2">
      {loading ? (
        <LoadingProgress />
      ) : (
        allSkills?.map((record: any) => (
          <div key={record?.skillId || record._tempId}>
            {record._isParsed && (
              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full mb-1 inline-block">
                From Resume
              </span>
            )}
            <SkillCard
              key={record?.skillId || record._tempId}
              id={record?.skillId || record._tempId}
              refetch={getSkills}
              yearsOfExperience={record?.yearsOfExperience}
              skillName={record._isParsed ? record.skillName : record?.skill?.name}
              proficiencyLevel={record?.proficiencyLevel}
              onEdit={() => onEdit(record)}
              onDelete={
                record._isParsed
                  ? () => setLocalParsed((prev) => prev.filter((r) => r._tempId !== record._tempId))
                  : undefined
              }
            />
          </div>
        ))
      )}

      <Button
        size="md"
        fullWidth
        color="default"
        className="mt-3"
        startContent={<MdAdd />}
        onPress={() => {
          setEditingId(null);
          fields.forEach((field) => setValue?.(field.name as any, ''));
          setShowForm(true);
        }}
      >
        Add more
      </Button>
      <div className="flex gap-2 mt-2">
        <Button
          size="md"
          fullWidth
          color="primary"
          onPress={localParsed.length > 0 ? handleSaveAllParsed : handleNext}
        >
          Next
        </Button>
      </div>
    </div>
  ) : (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-2">
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
                    selectedKeys={inputProps.value ? [inputProps.value] : []}
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

      <div className="mt-2 flex justify-between">
        {showForm && (
          <Button
            color="default"
            onPress={() => {
              setShowForm(false);
              setEditingId(null);
            }}
          >
            Cancel
          </Button>
        )}

        <Button
          isLoading={loading}
          endContent={<IoMdArrowForward size={18} />}
          color="primary"
          type="submit"
        >
          Save
        </Button>
      </div>
    </form>
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
