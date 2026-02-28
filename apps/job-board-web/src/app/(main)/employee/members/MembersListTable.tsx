"use client";

import TableDate from "@/app/components/table/TableDate";
import TableStatus from "@/app/components/table/TableStatus";
import usePagination from "@/app/hooks/usePagination";
import { IUser } from "@/app/types/types";
import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/react";
import { useEffect, useState } from "react";
import http from "@/app/api/http";
import ENDPOINTS from "@/app/api/endpoints";
import LoadingProgress from "@/app/components/lib/LoadingProgress";
import { FiEdit } from "react-icons/fi";
import { MdOutlineDeleteOutline } from "react-icons/md";
import { useRouter } from "next/navigation";
import routePaths from "@/app/config/routePaths";
import ConfirmationDialog from "@/app/components/dialogs/ConfirmationDialog";

const MembersListTable = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<IUser[]>([]);
  const [deleteModal, setDeleteModal] = useState({
    show: false,
    id: "",
  });

  const { page, setTotalPages, renderPagination } = usePagination();

  const fetchList = async () => {
    try {
      setLoading(true);
      const response: any = await http.get(ENDPOINTS.EMPLOYER.MEMBERS.LIST, {
        params: {
          page,
          limit: 10,
        },
      });
      if (response?.data) {
        setMembers(response?.data);
        setTotalPages(response?.pagination?.pageCount);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [page]);

  const handleDelete = async () => {
    try {
      const response: any = await http.delete(
        ENDPOINTS.EMPLOYER.MEMBERS.DELETE(deleteModal.id),
      );
      if (response?.data) {
        fetchList();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Table shadow="none">
        <TableHeader>
          <TableColumn>Member</TableColumn>
          <TableColumn>Designation</TableColumn>
          <TableColumn>Department</TableColumn>
          <TableColumn>Status</TableColumn>
          <TableColumn>Created At</TableColumn>
          <TableColumn align="end">Actions</TableColumn>
        </TableHeader>
        <TableBody
          isLoading={loading}
          loadingContent={<LoadingProgress />}
          emptyContent={"No rows to display."}
        >
          {members?.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <p>
                  {item?.firstName} {item?.lastName}
                </p>
                <p className="text-gray-400 text-xs mt-1 flex gap-1">
                  {item?.isActive ? item?.email : "Has been deleted"}
                </p>
              </TableCell>
              <TableCell>{item?.designation}</TableCell>
              <TableCell>{item?.department}</TableCell>
              <TableCell>
                <TableStatus status={item?.isActive ? "active" : "deleted"} />
              </TableCell>
              <TableCell>
                <TableDate date={item?.createdAt as any} />
              </TableCell>
              <TableCell
                align="right"
                className="flex justify-end items-center gap-2"
              >
                <Button
                  disabled={!item?.isActive}
                  onPress={() =>
                    router.push(
                      `${routePaths.employee.members.update(item?.userId!)}`,
                    )
                  }
                  size="sm"
                  variant="flat"
                  color={item?.isActive ? "primary" : "default"}
                  isIconOnly
                >
                  <FiEdit size={14} />
                </Button>
                <Button
                  disabled={!item?.isActive}
                  onPress={() =>
                    setDeleteModal({
                      show: true,
                      id: item?.userId,
                    })
                  }
                  size="sm"
                  variant="flat"
                  color={item?.isActive ? "danger" : "default"}
                  isIconOnly
                >
                  <MdOutlineDeleteOutline size={14} />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {renderPagination()}

      {deleteModal.show && (
        <ConfirmationDialog
          isOpen={deleteModal.show}
          color="danger"
          title="Delete Member"
          message="Are you sure you want to delete this member?"
          onConfirm={handleDelete}
          onClose={() => {
            setDeleteModal({
              show: false,
              id: "",
            });
          }}
        />
      )}
    </div>
  );
};

export default MembersListTable;
