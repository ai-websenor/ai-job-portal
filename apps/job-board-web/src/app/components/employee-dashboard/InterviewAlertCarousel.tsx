'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { IInterview } from '@/app/types/types';
import CommonUtils from '@/app/utils/commonUtils';
import { Avatar, Button, Card, CardBody, Chip, Skeleton } from '@heroui/react';
import dayjs from 'dayjs';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FiCalendar, FiClock } from 'react-icons/fi';
import { MdOutlineWorkOutline } from 'react-icons/md';

const InterviewAlertCarousel = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<IInterview[]>([]);

  const fetchUpcoming = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.INTERVIEWS.UPCOMING, {
        params: { page: 1, limit: 10 },
      });
      setItems(response?.data || []);
    } catch (error) {
      console.log(error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-1">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-[150px] w-[280px] shrink-0 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-950">Upcoming interviews</h2>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-1">
        {items.map((interview) => (
          <Card
            key={interview.id}
            shadow="none"
            className="w-[300px] shrink-0 border border-gray-100 bg-white"
          >
            <CardBody className="p-4">
              <div className="flex items-start gap-3">
                <Avatar
                  src={interview.candidateProfilePhoto || undefined}
                  name={interview.candidateName || 'Candidate'}
                  className="h-12 w-12 shrink-0 rounded-xl"
                  radius="sm"
                  fallback={<MdOutlineWorkOutline className="text-xl text-gray-400" />}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-950">
                    {interview.candidateName || 'Candidate'}
                  </p>
                  <p className="truncate text-xs font-medium text-gray-500">
                    {interview.jobTitle || 'Interview'}
                  </p>
                </div>
                <Chip
                  size="sm"
                  variant="flat"
                  color={CommonUtils.getStatusColor(interview.status)}
                  className="font-semibold capitalize"
                >
                  {CommonUtils.getInterviewStatusLabel(interview.status)}
                </Chip>
              </div>

              <div className="mt-4 grid gap-2 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-2">
                  <FiCalendar className="text-primary" />
                  {dayjs(interview.scheduledAt).format('ddd, DD MMM · h:mm A')}
                </span>
                <span className="flex items-center gap-2">
                  <FiClock className="text-primary" />
                  {interview.duration} mins
                </span>
                <span className="flex items-center gap-2">
                  {CommonUtils.getInterviewTypeLabel(interview.interviewType)}
                </span>
              </div>

              <Button
                as={Link}
                href={routePaths.employee.interviews.details(interview.id)}
                color="primary"
                variant="flat"
                size="sm"
                className="mt-4 w-full font-semibold"
              >
                View details
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default InterviewAlertCarousel;
