import { HiOutlineArrowRight } from "react-icons/hi2";

type Props = {
  title: string;
  count: number;
};

const TrendingJobCard = ({ title, count }: Props) => {
  return (
    <div className="relative w-full max-w-[360px] group cursor-pointer">
      <div className="absolute inset-0 translate-y-3 translate-x-2 bg-[#7C5CFC] rounded-[40px] opacity-100 transition-transform duration-300 group-hover:translate-y-4 group-hover:translate-x-3" />
      <div className="relative flex flex-col justify-between p-8 md:p-10 bg-white border border-gray-100 rounded-[40px] w-full min-h-[300px] shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:-translate-x-1">
        <div className="flex justify-between items-start w-full">
          <div className="text-[#7C5CFC]"></div>
          <div className="flex items-center justify-center w-12 h-12 rounded-full border-2 border-[#7C5CFC]/30 text-[#7C5CFC] group-hover:bg-[#7C5CFC] group-hover:text-white transition-all duration-300">
            <HiOutlineArrowRight size={24} />
          </div>
        </div>

        <div className="mt-auto space-y-2">
          <h3 className="text-2xl font-bold text-[#1A1A1A] leading-tight">
            {title}
          </h3>
          <p className="text-[#666666] text-lg font-medium">{count}+ jobs</p>
        </div>
      </div>
    </div>
  );
};

export default TrendingJobCard;
