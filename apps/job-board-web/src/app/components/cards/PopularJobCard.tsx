'use client';

import { IJob } from '@/app/types/types';
import TrendingJobCard from './TrendingJobCard';

type Props = {
  job: IJob;
};

const PopularJobCard = ({ job }: Props) => {
  return <TrendingJobCard job={job} />;
};

export default PopularJobCard;
