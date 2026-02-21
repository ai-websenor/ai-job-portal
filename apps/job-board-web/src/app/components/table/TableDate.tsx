import dayjs from "dayjs";

const TableDate = ({ date }: { date: string }) => {
  return (
    <div>
      <p>{dayjs(date).format("DD MMM YYYY")}</p>
      <p className="text-xs text-gray-400">{dayjs(date).format("hh:mm A")}</p>
    </div>
  );
};

export default TableDate;
