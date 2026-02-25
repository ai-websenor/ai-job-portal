import TableDate from "@/app/components/table/TableDate";
import TableStatus from "@/app/components/table/TableStatus";
import { employeeJobs } from "@/app/config/data";
import routePaths from "@/app/config/routePaths";
import usePagination from "@/app/hooks/usePagination";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useRouter } from "next/navigation";
import { IoMdMore } from "react-icons/io";

const JobsListTable = () => {
  const router = useRouter();
  const { renderPagination } = usePagination();

  return (
    <div>
      <Table shadow="none">
        <TableHeader>
          <TableColumn>Job</TableColumn>
          <TableColumn>Applications</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Posted Date</TableColumn>
          <TableColumn align="end">Actions</TableColumn>
        </TableHeader>
        <TableBody emptyContent={"No rows to display."}>
          {employeeJobs.map((job, index) => (
            <TableRow key={index}>
              <TableCell>
                <p>{job?.title}</p>
                <p className="text-gray-400 text-xs pl-4 mt-1 flex gap-1">
                  <li className="list-disc">{job?.remaining}</li>
                  <span>- {job.jobType}</span>
                </p>
              </TableCell>
              <TableCell>{job?.applications}</TableCell>
              <TableCell>
                <TableStatus status={job?.status} />
              </TableCell>
              <TableCell>
                <TableDate date={job?.createdAt} />
              </TableCell>
              <TableCell
                align="right"
                className="flex justify-end items-center gap-2"
              >
                <Button
                  size="sm"
                  color="primary"
                  variant="bordered"
                  onPress={() =>
                    `${router.push(routePaths.employee.jobs.applications("uid"))}?job=${job?.title}`
                  }
                >
                  View Application
                </Button>
                <Button size="sm" isIconOnly variant="light">
                  <IoMdMore size={20} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renderPagination()}
    </div>
  );
};

export default JobsListTable;
