"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import SkillCard from "@/app/components/cards/SkillCard";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import { ProficiencyLevel } from "@/app/types/enum";
import { OnboardingStepProps } from "@/app/types/types";
import CommonUtils from "@/app/utils/commonUtils";
import { addToast, Button, Input, Select, SelectItem } from "@heroui/react";
import { useEffect, useState } from "react";
import { Controller } from "react-hook-form";
import { IoMdArrowForward } from "react-icons/io";
import { MdAdd } from "react-icons/md";

const Skills = ({ control, errors, handleSubmit }: OnboardingStepProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [profileSkills, setProfileSkills] = useState<any[]>([]);

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

  useEffect(() => {
    getSkills();
  }, []);

  const onSubmit = async (data: any) => {
    const keys = fields?.map((field) => field.name);

    const payload = Object.fromEntries(
      Object.entries(data).filter(([key]) => keys.includes(key)),
    );

    try {
      setLoading(true);
      await http.post(ENDPOINTS.CANDIDATE.ADD_SKILL, {
        ...payload,
        yearsOfExperience: payload.experience,
      });
      getSkills();
      addToast({
        color: "success",
        title: "Success",
        description: "Skill added successfully",
      });
      setShowForm(false);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return !showForm && profileSkills?.length > 0 ? (
    <div className="flex flex-col gap-2">
      {loading ? (
        <LoadingProgress />
      ) : (
        profileSkills?.map((record: any) => (
          <SkillCard
            key={record?.id}
            id={record?.skill?.id}
            refetch={getSkills}
            skillName={record?.skill?.name}
            proficiencyLevel={record?.proficiencyLevel}
            experience={record?.yearsOfExperience}
          />
        ))
      )}

      <Button
        size="md"
        fullWidth
        color="default"
        className="mt-3"
        startContent={<MdAdd />}
        onPress={() => setShowForm(true)}
      >
        Add more
      </Button>
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
              if (field?.type === "select") {
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
                  >
                    {optionsMap[field.name]?.map((option: string) => (
                      <SelectItem key={option}>
                        {CommonUtils.keyIntoTitle(option)}
                      </SelectItem>
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
        {showForm ? (
          <Button color="default" onPress={() => setShowForm(false)}>
            Cancel
          </Button>
        ) : (
          <div />
        )}

        <Button
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
    name: "skillName",
    type: "text",
    label: "Skill Name",
    placeholder: "Ex: React Native",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "proficiencyLevel",
    type: "select",
    label: "Proficiency Level",
    placeholder: "Enter proficiency level",
    isDisabled: false,
    isRequired: true,
  },
  {
    name: "experience",
    type: "number",
    label: "Years of Experience",
    placeholder: "Ex: 2",
    isDisabled: false,
    isRequired: false,
  },
];
