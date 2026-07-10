import Image from "next/image";

interface NoDataFoundProps {
  message?: string;
}

const NoDataFound = ({ message }: NoDataFoundProps) => {
  return (
    <div className="min-h-[300px] bg-white flex flex-col items-center justify-center">
      <Image
        height={400}
        width={400}
        alt="No data found"
        src={"/assets/gifs/no-data.gif"}
      />
      {message && <p className="text-gray-500 mt-4 text-center">{message}</p>}
    </div>
  );
};

export default NoDataFound;
