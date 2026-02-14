"use client";

import { Card, CardBody } from "@heroui/react";

const StatsCard = ({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) => (
  <Card className="shadow-sm border border-gray-100 bg-white">
    <CardBody className="p-4">
      <p className="text-gray-500 text-sm font-medium">{label}</p>
      <p className={`text-4xl font-bold mt-2 ${color}`}>{value}</p>
    </CardBody>
  </Card>
);

export default StatsCard;
