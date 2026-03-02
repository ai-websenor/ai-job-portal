"use client";

import {
  Button,
  Card,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "@heroui/react";
import { HiOutlineInformationCircle } from "react-icons/hi";
import {
  FiArrowDownRight,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import { applicantChartData, topJobsData } from "@/app/config/data";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-gray-800 text-white text-[10px] py-1 px-2 rounded-md shadow-lg relative after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-gray-800">
        {`${payload[0].value}%`}
      </div>
    );
  }
  return null;
};

const EmployeeChartSection = () => {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6 border-none shadow-sm">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
              Number of applicants{" "}
              <HiOutlineInformationCircle className="text-gray-400" />
            </div>
            <div className="flex items-end gap-3">
              <h2 className="text-4xl font-bold">70%</h2>
              <div className="flex items-center gap-1 py-1 px-2 rounded-full bg-indigo-50 text-primary text-xs font-semibold mb-1">
                <div className="bg-primary/20 rounded-full p-0.5">
                  <FiArrowDownRight className="text-[10px]" />
                </div>
                -12.2%
              </div>
            </div>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="bordered"
                size="sm"
                endContent={<FiChevronDown />}
                className="border-gray-200 text-gray-600 font-medium"
              >
                Last 1 Year
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem key="1">Last 6 Months</DropdownItem>
              <DropdownItem key="2">Last 1 Year</DropdownItem>
              <DropdownItem key="3">Last 2 Years</DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>

        <div className="h-[250px] mt-8 -ml-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={applicantChartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8070EF" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8070EF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                vertical={false}
                stroke="#F1F5F9"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                padding={{ left: 10, right: 10 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#8070EF",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8070EF"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
                activeDot={{
                  r: 4,
                  fill: "#8070EF",
                  stroke: "#FFFFFF",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6 border-none shadow-sm">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold text-gray-800">Top Jobs</h2>
          <Button
            variant="light"
            size="sm"
            color="primary"
            className="bg-indigo-50 font-semibold"
            endContent={<FiChevronRight />}
          >
            View All
          </Button>
        </div>

        <div className="flex flex-col gap-6">
          <div className="flex justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b border-gray-50 pb-2">
            <span>Job title</span>
            <span>Applications</span>
          </div>

          <div className="flex flex-col gap-5">
            {topJobsData.map((job, index) => (
              <div
                key={index}
                className="flex flex-row md:flex-col xl:flex-row justify-between items-start group cursor-pointer"
              >
                <div>
                  <h3 className="text-sm font-bold text-gray-800 group-hover:text-primary transition-colors">
                    {job.title}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">{job.type}</p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-gray-800">
                    {job.applications} Applications
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EmployeeChartSection;
