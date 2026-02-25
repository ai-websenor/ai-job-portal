import {
  InterviewDuration,
  InterviewModes,
  InterviewTools,
  InterviewTypes,
} from "@/app/types/enum";
import CommonUtils from "@/app/utils/commonUtils";
import { scheduleInterviewSchema } from "@/app/utils/validations";
import {
  Button,
  Card,
  CardBody,
  DatePicker,
  Form,
  Input,
  Select,
  SelectItem,
  Textarea,
} from "@heroui/react";
import { yupResolver } from "@hookform/resolvers/yup";
import { getLocalTimeZone, parseDate, today } from "@internationalized/date";
import { Controller, useForm } from "react-hook-form";

const defaultValues = {
  candidateName: "",
  jobTitle: "",
  interviewMode: "",
  interviewTool: "",
  date: null,
  interviewDuration: "",
  interviewType: "",
  note: "",
};

const ScheduleInterviewForm = () => {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(scheduleInterviewSchema),
  });

  const onSubmit = async (data: typeof defaultValues) => {
    console.log(data);
  };

  return (
    <Card shadow="none" className="p-5 w-full">
      <CardBody>
        <Form onSubmit={handleSubmit(onSubmit)} className="w-full grid gap-5">
          <div className="grid sm:grid-cols-2 gap-5 w-full">
            {fields?.map((field, index) => {
              const error = errors?.[field?.name as keyof typeof defaultValues];

              return (
                <Controller
                  key={field.name}
                  control={control}
                  name={field?.name as keyof typeof defaultValues}
                  render={({ field: inputProps }) => {
                    if (field?.type === "date") {
                      return (
                        <DatePicker
                          size="lg"
                          value={
                            inputProps.value
                              ? parseDate(inputProps.value)
                              : null
                          }
                          onChange={(date) =>
                            inputProps.onChange(date?.toString())
                          }
                          label={field.label}
                          className="mb-4"
                          isInvalid={!!error}
                          errorMessage={error?.message}
                          minValue={today(getLocalTimeZone())}
                        />
                      );
                    }

                    if (field.type === "select" && field?.options?.length) {
                      return (
                        <Select
                          {...inputProps}
                          label={field.label}
                          placeholder={field.placeholder}
                          labelPlacement="outside"
                          size="lg"
                          className="mb-4"
                          isInvalid={!!error}
                          value={inputProps.value ?? ""}
                          onSelectionChange={(value) =>
                            inputProps.onChange(value)
                          }
                          errorMessage={error?.message}
                        >
                          {field?.options?.map((option: any) => (
                            <SelectItem key={option}>
                              {CommonUtils.keyIntoTitle(option)}
                            </SelectItem>
                          ))}
                        </Select>
                      );
                    }

                    return (
                      <Input
                        size="lg"
                        {...inputProps}
                        label={field?.label}
                        value={inputProps.value ?? ""}
                        autoFocus={Boolean(index === 0)}
                        labelPlacement="outside"
                        isInvalid={!!error?.message}
                        errorMessage={error?.message}
                        placeholder={field.placeholder}
                      />
                    );
                  }}
                />
              );
            })}
          </div>
          <Textarea
            size="lg"
            label={"Notes"}
            labelPlacement="outside"
            isInvalid={!!errors?.note}
            errorMessage={errors?.note?.message}
            placeholder={"Add notes"}
            minRows={8}
          />

          <div className="flex justify-end">
            <Button color="primary" isLoading={isSubmitting}>
              Submit
            </Button>
          </div>
        </Form>
      </CardBody>
    </Card>
  );
};

export default ScheduleInterviewForm;

const fields = [
  {
    name: "candidateName",
    type: "text",
    label: "Candidate Name",
    placeholder: "Payal Verma",
  },
  {
    name: "jobTitle",
    type: "text",
    label: "Job Title",
    placeholder: "Software Engineer",
  },
  {
    name: "interviewMode",
    type: "select",
    label: "Interview Mode",
    placeholder: "Select Interview Mode",
    options: Object.values(InterviewModes),
  },
  {
    name: "interviewTool",
    type: "select",
    label: "Interview Tool",
    placeholder: "Select Interview Tool",
    options: Object.values(InterviewTools),
  },
  {
    name: "interviewDuration",
    type: "select",
    label: "Interview Duration",
    placeholder: "Select Interview Duration",
    options: Object.values(InterviewDuration),
  },
  {
    name: "interviewType",
    type: "select",
    label: "Interview Type",
    placeholder: "Select Interview Type",
    options: Object.values(InterviewTypes),
  },
  {
    name: "date",
    type: "date",
    label: "Date & Time",
    placeholder: "Select Date & Time",
  },
];
