import JobCard from "@/app/components/cards/JobCard";
import { IJob } from "@/app/types/types";

const JobsSection = ({
  jobs,
  refetch,
}: {
  jobs: IJob[];
  refetch: () => void;
}) => {
  return (
    <div className="grid gap-5">
      {jobs?.map((job, index) => (
        <JobCard key={index} job={job} refetch={refetch} />
      ))}
    </div>
  );
};

export default JobsSection;
