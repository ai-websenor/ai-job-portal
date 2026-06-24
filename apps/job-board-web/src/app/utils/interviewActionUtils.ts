import dayjs from 'dayjs';
import { InterviewStatus } from '@/app/types/enum';
import { IInterview } from '@/app/types/types';

type InterviewActionPermissions = {
  canUpdate: boolean;
  canCreate: boolean;
};

export const getInterviewActionAvailability = (
  interview: Pick<IInterview, 'status' | 'scheduledAt' | 'rescheduledAt'> | null | undefined,
  permissions: InterviewActionPermissions,
) => {
  const activeMoment = dayjs(interview?.scheduledAt || interview?.rescheduledAt || undefined);
  const isFutureInterview = activeMoment.isAfter(dayjs());
  const isActiveRound =
    interview?.status === InterviewStatus.scheduled ||
    interview?.status === InterviewStatus.rescheduled;

  return {
    canReschedule: permissions.canUpdate && isActiveRound,
    canCancel: permissions.canUpdate && isActiveRound,
    canComplete: permissions.canUpdate && isActiveRound,
    canAddRound: permissions.canCreate && interview?.status === InterviewStatus.completed,
    isTimePassed: !isFutureInterview,
  };
};
