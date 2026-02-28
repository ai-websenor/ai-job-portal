import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import {
  InterviewDuration,
  InterviewModes,
  InterviewTools,
  InterviewTypes,
} from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import { scheduleInterviewSchema } from '@/app/utils/validations';
import {
  addToast,
  Button,
  Card,
  CardBody,
  DatePicker,
  Form,
  Input,
  Select,
  SelectItem,
  Textarea,
} from '@heroui/react';
import { yupResolver } from '@hookform/resolvers/yup';
import { getLocalTimeZone, today } from '@internationalized/date';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

const defaultValues = {
  type: InterviewTypes.HR,
  interviewMode: InterviewModes.offline,
  interviewTool: InterviewTools.zoom,
  interviewDuration: InterviewDuration.Thirty,
  location: '',
  scheduledAt: null,
  timezone: 'Asia/Kolkata',
};

const ScheduleInterviewForm = () => {
  const { id } = useParams();
  const router = useRouter();

  const {
    reset,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues,
    resolver: yupResolver(scheduleInterviewSchema),
  });

  const { interviewMode } = useWatch({ control });

  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      if (interviewMode === InterviewModes.online) {
        return field.name !== 'location';
      }

      if (interviewMode === InterviewModes.offline) {
        return field.name !== 'interviewTool' && field.name !== 'meetingLink';
      }

      return true;
    });
  }, [interviewMode]);

  const onSubmit = async (data: typeof defaultValues) => {
    try {
      await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.SCHEDULE, {
        ...data,
        applicationId: id,
        scheduledAt: dayjs(data.scheduledAt).toISOString(),
        interviewDuration: Number(data.interviewDuration),
      });
      reset();
      router.push(routePaths.employee.interviews.list);
      addToast({
        title: 'Success',
        color: 'success',
        description: 'Interview scheduled successfully',
      });
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <Card shadow="none" className="p-5 w-full">
      <CardBody>
        <Form onSubmit={handleSubmit(onSubmit)} className="w-full grid gap-5">
          <div className="grid sm:grid-cols-2 gap-5 w-full">
            {filteredFields?.map((field, index) => {
              const error = errors?.[field?.name as keyof typeof defaultValues];

              return (
                <Controller
                  key={field.name}
                  control={control}
                  name={field?.name as keyof typeof defaultValues}
                  render={({ field: inputProps }) => {
                    if (field?.type === 'date') {
                      return (
                        <DatePicker
                          {...field}
                          label={field.label}
                          labelPlacement="outside"
                          size="lg"
                          hideTimeZone
                          minValue={today(getLocalTimeZone()).add({ days: 1 })}
                          isInvalid={!!error}
                          errorMessage={error?.message}
                          onChange={(value) => {
                            inputProps.onChange(value);
                          }}
                        />
                      );
                    }

                    if (field.type === 'select' && field?.options?.length) {
                      return (
                        <Select
                          {...inputProps}
                          label={field.label}
                          placeholder={field.placeholder}
                          labelPlacement="outside"
                          size="lg"
                          className="mb-4"
                          isInvalid={!!error}
                          value={inputProps.value ?? ''}
                          onSelectionChange={(value) => inputProps.onChange(value)}
                          errorMessage={error?.message}
                        >
                          {field?.options?.map((option: any) => (
                            <SelectItem key={option?.key}>{option?.label}</SelectItem>
                          ))}
                        </Select>
                      );
                    }

                    if (field?.type === 'textarea') {
                      return (
                        <Textarea
                          size="lg"
                          minRows={8}
                          {...inputProps}
                          label={field?.label}
                          value={(inputProps.value as any) ?? ''}
                          labelPlacement="outside"
                          isInvalid={!!error?.message}
                          errorMessage={error?.message}
                          placeholder={field.placeholder}
                        />
                      );
                    }

                    return (
                      <Input
                        size="lg"
                        {...inputProps}
                        label={field?.label}
                        value={(inputProps.value as any) ?? ''}
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

          <div className="flex justify-end">
            <Button color="primary" type="submit" isLoading={isSubmitting}>
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
    name: 'interviewMode',
    type: 'select',
    label: 'Interview Mode',
    placeholder: 'Select Interview Mode',
    options: Object.values(InterviewModes).map((v) => ({
      key: v,
      label: CommonUtils.keyIntoTitle(v),
    })),
  },
  {
    name: 'interviewTool',
    type: 'select',
    label: 'Interview Tool',
    placeholder: 'Select Interview Tool',
    options: Object.values(InterviewTools).map((v) => ({
      key: v,
      label: CommonUtils.keyIntoTitle(v),
    })),
  },
  {
    name: 'interviewType',
    type: 'select',
    label: 'Interview Type',
    placeholder: 'Select Interview Type',
    options: Object.values(InterviewTypes).map((v) => ({
      key: v,
      label: CommonUtils.keyIntoTitle(v),
    })),
  },
  {
    name: 'scheduledAt',
    type: 'date',
    label: 'Interview Date',
    placeholder: 'Select schedule time',
  },
  {
    name: 'interviewDuration',
    type: 'select',
    label: 'Interview Duration',
    placeholder: 'Select Interview Duration',
    options: Object.entries(InterviewDuration)
      .filter(([key]) => isNaN(Number(key)))
      .map(([_, value]) => ({
        key: value,
        label: `${value} minutes`,
      })),
  },
  {
    name: 'location',
    type: 'textarea',
    label: 'Location',
    placeholder: 'Enter location',
  },
];
