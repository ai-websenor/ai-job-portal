import APP_CONFIG from "@/app/config/config";
import { plansData } from "@/app/config/data";
import { Button, Card, CardBody } from "@heroui/react";
import clsx from "clsx";
import { IoCheckmarkSharp } from "react-icons/io5";

type Props = {
  selectedPlan: string;
  plan: (typeof plansData)[0];
  setSelectedPlan: (id: string) => void;
};

const PlanCard = ({ plan, selectedPlan, setSelectedPlan }: Props) => {
  return (
    <Card
      as="div"
      radius="lg"
      isPressable
      shadow="none"
      onPress={() => setSelectedPlan(plan?.id)}
      className={clsx(
        "p-5 bg-white max-w-sm min-h-[400px] 2xl:min-h-[430px] h-full hover:scale-105 transition-all duration-300 cursor-pointer",
        {
          "border-primary border-2": selectedPlan === plan?.id,
        },
      )}
    >
      <CardBody className="flex flex-col gap-7 h-full justify-between">
        <div className="flex flex-col gap-7">
          <h2 className="font-bold text-2xl">{plan?.name}</h2>
          <p className="text-primary font-semibold text-5xl">
            {plan?.price ? (
              <span>
                {APP_CONFIG.CURRENCY}
                {plan?.price}
              </span>
            ) : (
              plan?.priceLabel
            )}
            <span className="text-sm font-medium ml-2 text-gray-700">
              /month
            </span>
          </p>

          <div className="grid gap-1">
            {plan?.features?.map((feature, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-gray-700"
              >
                <IoCheckmarkSharp className="flex-shrink-0" />
                <p className="font-medium text-sm">{feature}</p>
              </div>
            ))}
          </div>
        </div>

        <Button
          size="lg"
          className="w-full"
          color={plan?.id === "1" ? "default" : "primary"}
        >
          {plan?.id === "1" ? "Current Plan" : "Upgrade"}
        </Button>
      </CardBody>
    </Card>
  );
};

export default PlanCard;
