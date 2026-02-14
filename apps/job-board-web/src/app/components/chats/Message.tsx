import useUserStore from "@/app/store/useUserStore";
import clsx from "clsx";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type Props = {
  message: string;
  time: string;
  senderId: string;
};

const Message = ({ message, time, senderId }: Props) => {
  const { user } = useUserStore();
  const isMe = senderId === user?.userId;

  return (
    <div
      className={clsx(
        "flex w-full mb-2",
        isMe ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={clsx(
          "p-3 rounded-xl w-fit max-w-md text-sm flex flex-col text-gray-700",
          isMe
            ? "bg-secondary rounded-br-none"
            : "bg-[#f5f5f5] rounded-bl-none",
        )}
      >
        <div>{message}</div>
        <span className={clsx("text-[10px] mt-1 self-end text-gray-500")}>
          {dayjs(time).fromNow()}
        </span>
      </div>
    </div>
  );
};

export default Message;
