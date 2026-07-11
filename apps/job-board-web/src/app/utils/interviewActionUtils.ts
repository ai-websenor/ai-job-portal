import dayjs from 'dayjs';
import { InterviewStatus } from '@/app/types/enum';
import { IInterview } from '@/app/types/types';

type InterviewActionPermissions = {
  canUpdate: boolean;
  canCreate: boolean;
};

export const getInterviewActionAvailability = (
  interview: Pick<IInterview, 'status' | 'scheduledAt' | 'rescheduledAt' | 'applicationStatus'> | null | undefined,
  permissions: InterviewActionPermissions,
) => {
  const activeMoment = dayjs(interview?.scheduledAt || interview?.rescheduledAt || undefined);
  const isFutureInterview = activeMoment.isAfter(dayjs());
  
  const isTerminalApplicationStatus = [
    InterviewStatus.hired,
    InterviewStatus.rejected,
    InterviewStatus.withdrawn,
    InterviewStatus.canceled,
  ].includes(interview?.applicationStatus as InterviewStatus);

  const isActiveRound =
    !isTerminalApplicationStatus &&
    (interview?.status === InterviewStatus.scheduled ||
    interview?.status === InterviewStatus.rescheduled);

  return {
    canReschedule: permissions.canUpdate && isActiveRound,
    canCancel: permissions.canUpdate && isActiveRound,
    canComplete: permissions.canUpdate && isActiveRound,
    canAddRound: permissions.canCreate && !isTerminalApplicationStatus && interview?.status === InterviewStatus.completed,
    isTimePassed: !isFutureInterview,
  };
};
