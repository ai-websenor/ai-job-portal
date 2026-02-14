"use client";

import Image from "next/image";

const DownloadOurAppSection = () => {
  return (
    <div className="bg-secondary py-20 px-5">
      <div className="container flex sm:flex-row flex-col justify-between gap-20 items-center">
        <div>
          <h1 className="2xl:text-5xl text-3xl font-semibold">
            Download Our App and{" "}
            <span className="text-primary">
              Start <br /> Applying Anywhere
            </span>
          </h1>
          <p className="mt-5 text-gray-500">
            Our mobile app brings all the features of our job portal to your
            fingertips. <br /> Browse jobs, apply with one click, and get
            notifications for new opportunities.
          </p>
          <div className="flex gap-5 items-center mt-10">
            {stores.map((store) => (
              <Image
                key={store}
                src={store}
                alt={store}
                height={300}
                width={300}
                className="w-[150px] object-contain"
              />
            ))}
          </div>
        </div>
        <Image
          height={500}
          width={500}
          alt="download-app"
          src={"/assets/images/download-app.png"}
          className="sm:min-w-[500px] object-contain"
        />
      </div>
    </div>
  );
};

export default DownloadOurAppSection;

const stores = ["/assets/images/playstore.png", "/assets/images/appstore.png"];
