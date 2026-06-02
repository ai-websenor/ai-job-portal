import { IJob } from '@/app/types/types';
import PopularJobCard from '../cards/PopularJobCard';

const PopularJobsSection = ({ jobs }: { jobs: IJob[] }) => {
  return (
    <section className="py-12 md:py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-extrabold text-[#1A1A1A]">Popular Jobs</h2>
          <p className="text-[#666666] text-lg max-w-2xl mx-auto">
            Top companies are hiring now — and you could be their next great hire. Browse through
            popular openings tailored for ambitious talents.
          </p>
        </div>
        <div className="container mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8 lg:gap-10 xl:gap-12">
            {jobs?.map((job, index) => (
              <div key={job?.id || index} className="flex justify-center w-full">
                <PopularJobCard job={job} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularJobsSection;
