import { companiesData } from "@/app/config/data";
import CompanyCard from "../cards/CompanyCard";

const CompanySection = () => {
  return (
    <div className="grid gap-5">
      {companiesData?.map((company, index) => (
        <CompanyCard key={index} company={company as any} />
      ))}
    </div>
  );
};

export default CompanySection;
