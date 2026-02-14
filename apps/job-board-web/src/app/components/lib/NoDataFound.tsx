import Image from "next/image";

const NoDataFound = () => {
  return (
    <div className="min-h-[300px] bg-white flex items-center justify-center">
      <Image
        height={400}
        width={400}
        alt="No data found"
        src={"/assets/gifs/no-data.gif"}
      />
    </div>
  );
};

export default NoDataFound;
