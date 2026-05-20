'use client';

import { useEffect, useState } from 'react';
import { Button } from '@heroui/react';
import { useRouter } from 'next/navigation';
import {
  IoBriefcaseOutline,
  IoCashOutline,
  IoHomeOutline,
  IoLaptopOutline,
  IoPeopleOutline,
  IoRocketOutline,
} from 'react-icons/io5';
import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import routePaths from '@/app/config/routePaths';
import { ICandidateJobGroup } from '@/app/types/types';
import LoadingProgress from '../lib/LoadingProgress';

const groupIcons = {
  wfh: IoHomeOutline,
  remote: IoLaptopOutline,
  entry_level: IoRocketOutline,
  experienced: IoBriefcaseOutline,
  high_paid: IoCashOutline,
  most_applied: IoPeopleOutline,
};

const CandidateJobGroups = () => {
  const router = useRouter();
  const [groups, setGroups] = useState<ICandidateJobGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const getGroups = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.JOBS.RECOMMENDED_GROUPS);
      setGroups(response?.data || []);
    } catch (error) {
      console.log('Failed to fetch candidate job groups:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getGroups();
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Jobs Matched to Your Profile</h2>
        <Button size="sm" variant="flat" color="primary" onPress={getGroups}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6 bg-white border border-gray-100 rounded-lg">
          <LoadingProgress />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {groups.map((group) => {
            const Icon = groupIcons[group.id] || IoBriefcaseOutline;

            return (
              <button
                key={group.id}
                type="button"
                onClick={() => router.push(routePaths.jobs.group(group.id))}
                className="group min-h-[104px] rounded-lg border border-gray-200 bg-white p-4 text-left transition hover:border-primary hover:shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon size={20} />
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{group.count}</span>
                </div>
                <p className="mt-4 font-semibold text-gray-800 group-hover:text-primary">
                  {group.name}
                </p>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default CandidateJobGroups;
