"use client";

import PlanCard from "@/app/components/cards/PlanCard";
import BackButton from "@/app/components/lib/BackButton";
import { plansData } from "@/app/config/data";
import withAuth from "@/app/hoc/withAuth";
import { useState } from "react";

const page = () => {
  const [selectedPlan, setSelectedPlan] = useState("1");

  return (
    <>
      <title>Subscriptions</title>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <BackButton showLabel />
        <h1 className="text-2xl font-bold mt-1">Subscriptions</h1>
        <div className="grid gap-10 sm:grid-cols-3 items-center mt-7 w-full">
          {plansData.map((plan) => (
            <PlanCard
              plan={plan}
              key={plan.id}
              selectedPlan={selectedPlan}
              setSelectedPlan={setSelectedPlan}
            />
          ))}
        </div>
      </div>
    </>
  );
};

export default withAuth(page);
