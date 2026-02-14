import ProfilePerformanceCard from "@/app/components/dashboard/ProfilePerformanceCard";
import ProfileCard from "@/app/components/dashboard/ProfileCard";
import clsx from "clsx";

const DashboardLeftSection = ({ classNames }: { classNames?: string }) => {
  return (
    <div className={clsx("flex flex-col gap-6 h-full", classNames)}>
      <ProfileCard />
      <ProfilePerformanceCard />
    </div>
  );
};

export default DashboardLeftSection;
