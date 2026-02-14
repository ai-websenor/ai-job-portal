"use client";

import { Card, CardBody } from "@heroui/react";
import {
  FaFileAlt,
  FaDollarSign,
  FaUserGraduate,
  FaLightbulb,
} from "react-icons/fa";

const CareerToolsWidget = () => {
  const tools = [
    {
      id: 1,
      title: "Resume Writing Service",
      description: "Get expert help to build a winning resume",
      icon: <FaFileAlt className="text-primary" />,
      bg: "bg-primary/20",
      linkText: "Learn More →",
      linkColor: "text-primary",
    },
    {
      id: 2,
      title: "Salary Calculator",
      description: "Know your worth in the job market",
      icon: <FaDollarSign className="text-green-500" />,
      bg: "bg-green-50",
      linkText: "Learn More →",
      linkColor: "text-green-500",
    },
    {
      id: 3,
      title: "Skill Assessment",
      description: "Take tests and get certified",
      icon: <FaUserGraduate className="text-primary" />,
      bg: "bg-primary/10",
      linkText: "Learn More →",
      linkColor: "text-primary",
    },
    {
      id: 4,
      title: "Interview Tips",
      description: "Ace your next interview with our guide",
      icon: <FaLightbulb className="text-orange-500" />,
      bg: "bg-orange-50",
      linkText: "Learn More →",
      linkColor: "text-orange-500",
    },
  ];

  return (
    <Card className="w-full bg-white shadow-sm border border-gray-100 p-4">
      <CardBody className="p-0">
        <h3 className="font-bold text-gray-800 mb-5 text-lg">Career Tools</h3>
        <div className="grid xl:grid-cols-2 gap-3">
          {tools.map((tool) => (
            <div
              key={tool.id}
              className={`${tool.bg} p-3 rounded-xl flex flex-col justify-between h-auto min-h-[140px] hover:shadow-md transition-shadow cursor-pointer group`}
            >
              <div className="mb-2 p-2 bg-white w-fit rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                {tool.icon}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-xs mb-1 line-clamp-2">
                  {tool.title}
                </h4>
                <p className="text-[10px] text-gray-500 mb-2 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>
                <span
                  className={`text-[10px] font-bold ${tool.linkColor} group-hover:underline`}
                >
                  {tool.linkText}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
};

export default CareerToolsWidget;
