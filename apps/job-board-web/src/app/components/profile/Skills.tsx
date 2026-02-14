"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import { ProfileEditProps } from "@/app/types/types";
import { addToast, Button, Input, Select, SelectItem } from "@heroui/react";
import { useEffect, useState } from "react";
import { MdAdd } from "react-icons/md";
import SkillCard from "../cards/SkillCard";
import CommonUtils from "@/app/utils/commonUtils";
import { Controller } from "react-hook-form";
import { ProficiencyLevel } from "@/app/types/enum";
import LoadingProgress from "../lib/LoadingProgress";

const Skills = ({
  errors,
  control,
  isSubmitting,
  handleSubmit,
}: ProfileEditProps) => {
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [profileSkills, setProfileSkills] = useState<any[]>([]);

  const toggleForm = () => setShowForm(!showForm);

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
              key={record?.id}
              id={record?.skill?.id}
              refetch={getSkills}
              skillName={record?.skill?.name}
              proficiencyLevel={record?.proficiencyLevel}
              experience={record?.yearsOfExperience}
            />
          ))}

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
          </div>

          <div className="mt-10 flex gap-3 justify-end">
            <Button size="md" onPress={toggleForm}>
              Cancel
            </Button>
            <Button
              color="primary"
              size="md"
              type="submit"
              isLoading={isSubmitting}
            >
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
