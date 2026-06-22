/* eslint-disable @typescript-eslint/no-explicit-any */
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import InterviewConflictDialog from '@/app/components/dialogs/InterviewConflictDialog';
import {
  InterviewDuration,
  InterviewModes,
  InterviewTools,
  InterviewTypes,
} from '@/app/types/enum';
import { IInterviewConflict } from '@/app/types/types';
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
import { I18nProvider } from '@react-aria/i18n';
import { yupResolver } from '@hookform/resolvers/yup';
import { getLocalTimeZone, now } from '@internationalized/date';
import dayjs from 'dayjs';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';

const defaultValues = {
  type: InterviewTypes.HR,
  customType: '',
  roundName: '',
  interviewMode: InterviewModes.offline,
  interviewTool: InterviewTools.zoom,
  duration: InterviewDuration.Thirty,
  location: '',
  scheduledAt: null,
  timezone: 'Asia/Kolkata',
};

type ScheduleInterviewPayload = {
  applicationId: string;
  type: string;
  customType?: string;
  roundName?: string;
  interviewMode: string;
  interviewTool?: string;
  duration: number;
  location: string;
  scheduledAt: string;
  timezone: string;
  ignoreConflict?: boolean;
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

  const { interviewMode, type } = useWatch({ control });

  // Auto-filled round number = existing interview rounds for this application + 1.
  // Read-only; the sequence is system-owned (derived from createdAt order on the
  // server). Employers can only label the round via the editable "Round Name".
  const [roundNumber, setRoundNumber] = useState<number | null>(null);
  const [conflictDialog, setConflictDialog] = useState<{
    isOpen: boolean;
    conflicts: IInterviewConflict[];
  }>({
    isOpen: false,
    conflicts: [],
  });
  const [pendingPayload, setPendingPayload] = useState<ScheduleInterviewPayload | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const res = await http.get(ENDPOINTS.EMPLOYER.INTERVIEWS.ROUNDS(id as string));
        const total = res?.data?.totalRounds ?? 0;
        if (active) setRoundNumber(total + 1);
      } catch {
        if (active) setRoundNumber(1);
      }
    })();
    return () => {
      active = false;
    };
  }, [id]);

  const filteredFields = useMemo(() => {
    return fields.filter((field) => {
      // Custom type name only relevant when "Other" is selected
      if (field.name === 'customType' && type !== InterviewTypes.Other) {
        return false;
      }

      if (interviewMode === InterviewModes.online) {
        return field.name !== 'location';
      }

      if (interviewMode === InterviewModes.offline) {
        return field.name !== 'interviewTool' && field.name !== 'meetingLink';
      }

      return true;
    });
  }, [interviewMode, type]);

  const buildPayload = (data: typeof defaultValues): ScheduleInterviewPayload => ({
    ...data,
    applicationId: id as string,
    duration: Number(data.duration),
    roundName: data?.roundName?.trim() || undefined,
    ...(data?.type === InterviewTypes.Other
      ? { customType: data?.customType?.trim() }
      : { customType: undefined }),
    ...(data?.interviewMode === InterviewModes.online && {
      interviewTool: data?.interviewTool,
    }),
    scheduledAt: dayjs((data as any)?.scheduledAt?.toDate(getLocalTimeZone())).toISOString(),
  });

  const submit = async (payload: ScheduleInterviewPayload) => {
    await http.post(ENDPOINTS.EMPLOYER.INTERVIEWS.SCHEDULE, payload);
    reset();
    router.push(routePaths.employee.interviews.list);
    addToast({
      title: 'Success',
      color: 'success',
      description: 'Interview scheduled successfully',
    });
  };

  const onSubmit = async (data: typeof defaultValues) => {
    const payload = buildPayload(data);

    try {
      await submit(payload);
    } catch (error: any) {
      if (error?.code === 'INTERVIEW_TIME_CONFLICT') {
        setPendingPayload(payload);
        setConflictDialog({
          isOpen: true,
          conflicts: error?.conflicts || [],
        });
        return;
      }

      console.log(error);
    }
  };

  const handleConfirmConflict = async () => {
    if (!pendingPayload) return;

    try {
      setRetryLoading(true);
      await submit({ ...pendingPayload, ignoreConflict: true });
      setConflictDialog({ isOpen: false, conflicts: [] });
      setPendingPayload(null);
    } catch (error) {
      console.log(error);
    } finally {
      setRetryLoading(false);
    }
  };

  const handleCloseConflictDialog = () => {
    setConflictDialog({ isOpen: false, conflicts: [] });
    setPendingPayload(null);
  };

  return (
    <>
      <Card shadow="none" className="p-5 w-full">
        <CardBody>
          <Form onSubmit={handleSubmit(onSubmit)} className="w-full grid gap-5">
            <div className="grid sm:grid-cols-2 gap-5 w-full items-center">
              <Input
                size="lg"
                label="Interview Round"
                labelPlacement="outside"
                isReadOnly
                value={roundNumber ? `Round ${roundNumber}` : 'Round 1'}
                description="Auto-filled from previous rounds. Use Round Name to label it."
              />
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
                          <I18nProvider locale="en-GB">
                            <DatePicker
                              {...field}
                              label={field.label}
                              labelPlacement="outside"
                              size="lg"
                              hideTimeZone
                              granularity="minute"
                              hourCycle={12}
                              showMonthAndYearPickers
                              minValue={now(getLocalTimeZone())}
                              isInvalid={!!error}
                              errorMessage={error?.message}
                              onChange={(value) => {
                                inputProps.onChange(value);
                              }}
                            />
                          </I18nProvider>
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

      <InterviewConflictDialog
        isOpen={conflictDialog.isOpen}
        conflicts={conflictDialog.conflicts}
        onClose={handleCloseConflictDialog}
        onConfirm={handleConfirmConflict}
        loading={retryLoading}
      />
    </>
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
    name: 'type',
    type: 'select',
    label: 'Interview Type',
    placeholder: 'Select Interview Type',
    options: Object.values(InterviewTypes).map((v) => ({
      key: v,
      label: CommonUtils.keyIntoTitle(v),
    })),
  },
  {
    name: 'customType',
    type: 'text',
    label: 'Custom Interview Type',
    placeholder: 'Enter interview type name (e.g. Founder Round)',
  },
  {
    name: 'roundName',
    type: 'text',
    label: 'Round Name (optional)',
    placeholder: 'e.g. System Design, Final HR',
  },
  {
    name: 'scheduledAt',
    type: 'date',
    label: 'Interview Date & Time',
    placeholder: 'Select schedule time',
  },
  {
    name: 'duration',
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
