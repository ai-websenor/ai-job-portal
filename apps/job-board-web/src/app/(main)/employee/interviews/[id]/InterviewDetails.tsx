import { InterviewTools } from '@/app/types/enum';
import { InterviewDetails as InterviewDetailsType } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Button, Chip } from '@heroui/react';
import Image from 'next/image';
import { BsLink45Deg, BsMicrosoftTeams, BsTelephone } from 'react-icons/bs';

const InterviewDetails = ({ interview }: { interview: InterviewDetailsType }) => {
  console.log(interview);

  const toolConfigs = {
    [InterviewTools.teams]: {
      icon: <BsMicrosoftTeams size={18} />,
      color: 'primary' as const,
    },
    [InterviewTools.zoom]: {
      icon: <BsMicrosoftTeams size={18} />,
      color: 'primary' as const,
    },
    [InterviewTools.phone]: {
      icon: <BsTelephone size={18} />,
      color: 'success' as const,
    },
    [InterviewTools.other]: {
      icon: <BsLink45Deg size={18} />,
      color: 'default' as const,
    },
  };

  const openMeetingLink = () => {
    if (typeof window !== 'undefined') {
      window.open(interview?.hostJoinUrl, '_blank');
    }
  };

  return (
    <div>
      <div className="relative h-[120px] w-full overflow-hidden rounded-xl">
        <Image
          alt="cover"
          src="/assets/images/interview-details-cover.png"
          fill
          className="object-cover"
          priority
        />

        <div className="absolute inset-0 z-10 flex flex-row items-center justify-between bg-black/10 p-6 text-white">
          <div className="flex-1 min-w-0 mr-4">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight truncate">
              {interview?.application?.job?.title}
            </h2>
            <p className="text-xs md:text-sm font-medium text-gray-100 mt-0.5">
              {[
                CommonUtils.keyIntoTitle(interview?.interviewType),
                CommonUtils.keyIntoTitle(interview?.interviewMode),
                CommonUtils.keyIntoTitle(interview?.interviewTool),
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>
          </div>

          <div className="shrink-0">
            <Chip color={CommonUtils.getStatusColor(interview?.application?.status)}>
              {CommonUtils.keyIntoTitle(interview?.application?.status)}
            </Chip>
          </div>
        </div>
      </div>

      {interview?.hostJoinUrl && (
        <div className="my-3 flex justify-center">
          <Button
            onPress={openMeetingLink}
            className="font-medium min-w-[300px]"
            startContent={toolConfigs[interview?.interviewTool]?.icon}
            color={toolConfigs[interview?.interviewTool]?.color}
          >
            Join Meeting
          </Button>
        </div>
      )}
    </div>
  );
};

export default InterviewDetails;
