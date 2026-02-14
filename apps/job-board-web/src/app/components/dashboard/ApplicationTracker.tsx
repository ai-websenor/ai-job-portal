"use client";

import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Tooltip,
  Card,
  CardBody,
  Button,
} from "@heroui/react";
import { FaExternalLinkAlt } from "react-icons/fa";

const statusColorMap: Record<
  string,
  "success" | "warning" | "danger" | "default" | "primary" | "secondary"
> = {
  active: "success",
  paused: "danger",
  vacation: "warning",
  "Interview Scheduled": "success",
  Shortlisted: "success",
  Viewed: "warning",
  Rejected: "danger",
  Submitted: "default",
};

const columns = [
  { name: "JOB TITLE", uid: "jobTitle" },
  { name: "COMPANY", uid: "company" },
  { name: "APPLIED ON", uid: "appliedOn" },
  { name: "STATUS", uid: "status" },
  { name: "LAST UPDATED", uid: "lastUpdated" },
  { name: "ACTIONS", uid: "actions" },
];

const applications = [
  {
    id: 1,
    jobTitle: "Senior UI Designer",
    company: "Google India",
    appliedOn: "Oct 10, 2025",
    status: "Interview Scheduled",
    lastUpdated: "Oct 14, 2025",
  },
  {
    id: 2,
    jobTitle: "Product Designer",
    company: "Amazon",
    appliedOn: "Oct 8, 2025",
    status: "Shortlisted",
    lastUpdated: "Oct 12, 2025",
  },
  {
    id: 3,
    jobTitle: "UX Designer",
    company: "Microsoft",
    appliedOn: "Oct 5, 2025",
    status: "Viewed",
    lastUpdated: "Oct 6, 2025",
  },
  {
    id: 4,
    jobTitle: "Visual Designer",
    company: "Zomato",
    appliedOn: "Oct 3, 2025",
    status: "Rejected",
    lastUpdated: "Oct 7, 2025",
  },
  {
    id: 5,
    jobTitle: "UI/UX Designer",
    company: "Swiggy",
    appliedOn: "Sep 28, 2025",
    status: "Submitted",
    lastUpdated: "Sep 28, 2025",
  },
];

const ApplicationTracker = () => {
  return (
    <Card className="w-full bg-white shadow-sm border border-gray-100 p-4">
      <CardBody className="p-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Application Tracker
          </h3>
          <Button
            size="sm"
            variant="light"
            color="primary"
            className="font-medium"
          >
            View All
          </Button>
        </div>

        <Table
          aria-label="Application Tracker Table"
          shadow="none"
          classNames={{
            th: "bg-gray-50 text-gray-500 font-semibold text-xs uppercase tracking-wider",
            td: "text-sm",
            wrapper: "p-0",
          }}
        >
          <TableHeader columns={columns}>
            {(column) => (
              <TableColumn
                key={column.uid}
                align={column.uid === "actions" ? "center" : "start"}
              >
                {column.name}
              </TableColumn>
            )}
          </TableHeader>
          <TableBody items={applications}>
            {(item) => (
              <TableRow
                key={item.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer border-b border-gray-50 last:border-none"
              >
                <TableCell className="font-semibold text-gray-800">
                  {item.jobTitle}
                </TableCell>
                <TableCell className="text-gray-600">{item.company}</TableCell>
                <TableCell className="text-gray-500">
                  {item.appliedOn}
                </TableCell>
                <TableCell>
                  <Chip
                    className="capitalize border-none gap-1 font-medium"
                    color={statusColorMap[item.status]}
                    size="sm"
                    variant="flat"
                  >
                    {item.status}
                  </Chip>
                </TableCell>
                <TableCell className="text-gray-500">
                  {item.lastUpdated}
                </TableCell>
                <TableCell>
                  <div className="relative flex items-center gap-2 justify-center">
                    <Tooltip content="View Details">
                      <span className="text-lg text-gray-400 hover:text-primary cursor-pointer active:opacity-50 transition-colors">
                        <FaExternalLinkAlt size={14} />
                      </span>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>
    </Card>
  );
};

export default ApplicationTracker;
