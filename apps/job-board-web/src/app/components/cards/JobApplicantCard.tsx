import Link from 'next/link';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Button, Card, CardBody } from '@heroui/react';
import routePaths from '@/app/config/routePaths';

type Props = {
  applicationId: string;
  createdAt: string;
  seeker: {
    id: string;
    email: string;
    profilePhoto: string;
    firstName: string;
    lastName: string;
  };
};

const JobApplicantCard = ({ applicationId, seeker, createdAt }: Props) => {
  const { profilePhoto, email, firstName, lastName } = seeker ?? {};

  return (
    <Card className="group hover:scale-[1.05] transition-all duration-300" shadow="sm" radius="lg">
      <CardBody className="flex flex-col items-center p-6 pt-10">
        <Avatar
          src={profilePhoto}
          className="w-24 h-24 text-large mb-4 ring-4 ring-default-100"
          isBordered
          color="primary"
        />
        <div className="flex flex-col items-center gap-1 mb-4 text-center">
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {firstName} {lastName}
          </h3>
          <p className="text-sm text-default-500">{email}</p>
          <p className="text-[10px] text-default-400 font-bold tracking-[0.15em] uppercase">
            Applied {CommonUtils.determineDays(createdAt)}
          </p>
        </div>
        <Button
          as={Link}
          href={routePaths.employee.jobs.applicantProfile(applicationId, seeker.id)}
          color="primary"
          fullWidth
          size="sm"
        >
          View profile
        </Button>
      </CardBody>
    </Card>
  );
};

export default JobApplicantCard;
