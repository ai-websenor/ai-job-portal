const ReapplyMessage = ({ reapplyDaysLeft }: { reapplyDaysLeft: number }) => {
  return (
    <p className="text-xs font-bold text-danger bg-danger-50 px-3 py-1 rounded-full border border-danger-100">
      You can reapply in {reapplyDaysLeft} days
    </p>
  );
};

export default ReapplyMessage;
