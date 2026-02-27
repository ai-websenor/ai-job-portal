import { Card, CardHeader, CardBody, CardFooter, Avatar, Chip } from '@heroui/react';
import { IoBriefcaseOutline } from 'react-icons/io5';
import { ICompany } from '@/app/types/types';

type Props = {
  company: ICompany;
};

const CompanyCard = ({ company }: Props) => {
  return (
    <Card shadow="none" className="w-full border bg-white transition-all duration-300 group">
      <CardHeader className="flex justify-between items-start pt-5 px-5 pb-0">
        <Avatar
          name={company.name}
          className="w-12 h-12 text-lg font-bold bg-gray-100 rounded-xl"
          radius="md"
        />
        <div className="flex items-center gap-1 bg-primary-50 dark:bg-primary-900/20 text-primary dark:text-primary-400 px-3 py-1 rounded-md text-xs font-semibold">
          <IoBriefcaseOutline />
          {company.jobs} Jobs
        </div>
      </CardHeader>

      <CardBody className="px-5 py-4">
        <h3 className="text-lg font-bold mb-2 text-primary transition-colors">{company.name}</h3>
        <p className="text-sm text-gray-500 leading-relaxed line-clamp-3">{company.description}</p>
      </CardBody>

      <CardFooter className="px-5 pb-5 pt-0">
        <Chip
          variant="faded"
          className="bg-orange-50 border-orange-200 text-orange-500 font-medium px-2"
          size="sm"
          radius="sm"
        >
          {company.category}
        </Chip>
      </CardFooter>
    </Card>
  );
};

export default CompanyCard;
