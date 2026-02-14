import TrendingJobCard from "../cards/TrendingJobCard";
import { IJob } from "@/app/types/types";

const TrendingJobsSection = ({ jobs }: { jobs: IJob[] }) => {
  return (
    <section className="py-12 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#1A1A1A]">
            Trending Job Opportunities
          </h2>
          <p className="text-[#666666] text-lg max-w-2xl mx-auto">
            Explore the most popular job categories and find your next career
            move with ease.
          </p>
        </div>
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 lg:gap-10 xl:gap-12">
            {jobs?.map((job, index) => (
              <div key={index} className="flex justify-center">
                <TrendingJobCard
                  key={job?.id}
                  title={job?.title}
                  count={job?.viewCount || 0}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrendingJobsSection;
