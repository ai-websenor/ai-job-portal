"use client";

import routePaths from "@/app/config/routePaths";
import { Button, Image } from "@heroui/react";
import { useRouter } from "next/navigation";
import { use } from "react";

const page = ({ params }: { params: Promise<{ companyName: string }> }) => {
  const router = useRouter();
  const { companyName } = use(params);

  return (
    <>
      <title>Application Sent</title>
      <div className="my-10 container flex items-center justify-center">
        <div className="text-center">
          <Image
            src="/assets/images/application-sent.png"
            alt="Application Sent"
            width={300}
            height={300}
          />
          <p className="text-3xl font-bold">
            Your application was sent to <br /> {companyName}
          </p>
          <p className="text-gray-500 font-medium my-5">
            You’ll receive email confirmation shortly. <br /> keep an eye on
            your inbox for updates.
          </p>
          <Button
            color="primary"
            size="lg"
            variant="bordered"
            onPress={() => router.push(routePaths.jobs.search)}
          >
            Browse more jobs
          </Button>
        </div>
      </div>
    </>
  );
};

export default page;
