'use client';

import routePaths from '@/app/config/routePaths';
import { IJob } from '@/app/types/types';
import { Avatar, Button, Card, CardBody } from '@heroui/react';
import Link from 'next/link';
import { MdOutlineWorkOutline } from 'react-icons/md';
import clsx from 'clsx';

type Props = {
  job: Pick<IJob, 'id' | 'title' | 'company'>;
  isMe?: boolean;
};

const JobPreviewCard = ({ job, isMe }: Props) => {
  return (
    <Card 
      shadow="none" 
      className={clsx(
        "border",
        isMe ? "border-white/20 bg-white/10" : "border-primary/15 bg-primary/5"
      )}
    >
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <Avatar
          src={job.company?.logoUrl || undefined}
          name={job.company?.name || job.title}
          className="h-12 w-12 shrink-0 rounded-xl bg-white/20"
          radius="sm"
          fallback={<MdOutlineWorkOutline className={clsx("text-xl", isMe ? "text-white/70" : "text-gray-400")} />}
        />
        <div className="min-w-0 flex-1">
          <p className={clsx("truncate text-sm font-bold", isMe ? "text-white" : "text-gray-950")}>
            {job.title}
          </p>
          <p className={clsx("truncate text-xs font-medium", isMe ? "text-white/80" : "text-gray-500")}>
            {job.company?.name || 'Company not available'}
          </p>
        </div>
        <Button
          as={Link}
          href={routePaths.jobs.detail(job.id)}
          size="sm"
          variant={isMe ? "solid" : "flat"}
          className={clsx("shrink-0 font-semibold", isMe ? "bg-white text-primary" : "bg-primary/10 text-primary")}
        >
          View Job
        </Button>
      </CardBody>
    </Card>
  );
};

export default JobPreviewCard;
