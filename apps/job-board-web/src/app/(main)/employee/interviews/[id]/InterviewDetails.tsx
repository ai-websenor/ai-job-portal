import { InterviewDetails as InterviewDetailsType } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Chip } from '@heroui/react';
import Image from 'next/image';

const InterviewDetails = ({ interview }: { interview: InterviewDetailsType }) => {
  console.log(interview);

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
    </div>
  );
};

export default InterviewDetails;
