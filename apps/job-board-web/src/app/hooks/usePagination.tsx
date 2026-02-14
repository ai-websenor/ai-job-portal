import { Pagination } from "@heroui/react";
import { useState } from "react";

const usePagination = () => {
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleChange = (page: number) => {
    setPage(page);
  };

  const renderPagination = () => {
    return (
      <div className="flex justify-center my-5">
        <Pagination
          total={totalPages}
          initialPage={1}
          page={page}
          onChange={handleChange}
          color="primary"
          variant="flat"
          showControls
        />
      </div>
    );
  };

  return { page, setTotalPages, renderPagination };
};

export default usePagination;
