import Link from "next/link";
import CommonUtils from "@/app/utils/commonUtils";
import { Avatar, Button, Card, CardBody } from "@heroui/react";
import routePaths from "@/app/config/routePaths";

type Props = {
  id: string;
  profilePhoto: string;
  name: string;
  createdAt: string;
};

const JobApplicantCard = ({ id, profilePhoto, name, createdAt }: Props) => {
  return (
    <Card
      className="group hover:scale-[1.05] transition-all duration-300"
      shadow="sm"
      radius="lg"
    >
      <CardBody className="flex flex-col items-center p-6 pt-10">
        <Avatar
          src={profilePhoto}
          className="w-24 h-24 text-large mb-4 ring-4 ring-default-100"
          isBordered
          color="primary"
        />
        <div className="flex flex-col items-center gap-1 mb-8 text-center">
          <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h3>
          <p className="text-[10px] text-default-400 font-bold tracking-[0.15em] uppercase">
            Applied {CommonUtils.determineDays(createdAt)}
          </p>
        </div>
        <Button
          as={Link}
          href={routePaths.employee.jobs.applicantProfile(id)}
          color="primary"
          fullWidth
        >
          View profile
        </Button>
      </CardBody>
    </Card>
  );
};

export default JobApplicantCard;
