import { Card, CardBody } from "@heroui/react";

type Props = {
  value: string;
  title: string;
  icon: any;
};

const EmployeeDashboardAnalyticsCard = ({
  value,
  title,
  icon: Icon,
}: Props) => {
  return (
    <Card className="bg-secondary border-none shadow-none relative h-full">
      <CardBody className="p-6 flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <h2 className="text-4xl font-bold text-primary leading-none">
            {value}
          </h2>
          <div className="bg-primary p-1.5 rounded-full border-2 border-white flex items-center justify-center text-white shadow-md">
            <Icon size={18} />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-lg xl:text-xl font-bold text-foreground leading-tight tracking-tight">
            {title}
          </p>
        </div>
      </CardBody>
    </Card>
  );
};

export default EmployeeDashboardAnalyticsCard;
