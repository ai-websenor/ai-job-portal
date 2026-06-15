'use client';

import routePaths from '@/app/config/routePaths';
import { IJob } from '@/app/types/types';
import { Avatar, Button, Card, CardBody } from '@heroui/react';
import Link from 'next/link';
import { MdOutlineWorkOutline } from 'react-icons/md';

type Props = {
  job: Pick<IJob, 'id' | 'title' | 'company'>;
};

const JobPreviewCard = ({ job }: Props) => {
  return (
    <Card shadow="none" className="border border-primary/15 bg-primary/5">
      <CardBody className="flex flex-row items-center gap-3 p-3">
        <Avatar
          src={job.company?.logoUrl || undefined}
          name={job.company?.name || job.title}
          className="h-12 w-12 shrink-0 rounded-xl"
          radius="sm"
          fallback={<MdOutlineWorkOutline className="text-xl text-gray-400" />}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-gray-950">{job.title}</p>
          <p className="truncate text-xs font-medium text-gray-500">{job.company?.name || 'Company not available'}</p>
        </div>
        <Button
          as={Link}
          href={routePaths.jobs.detail(job.id)}
          size="sm"
          color="primary"
          variant="flat"
          className="shrink-0 font-semibold"
        >
          View Job
        </Button>
      </CardBody>
    </Card>
  );
};

export default JobPreviewCard;
