"use client";

import { motion } from "framer-motion";
import BackButton from "@/app/components/lib/BackButton";
import { cmsData } from "@/app/config/data";
import CommonUtils from "@/app/utils/commonUtils";
import NoDataFound from "@/app/components/lib/NoDataFound";

const page = async ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = await params;
  const content = cmsData[slug as keyof typeof cmsData];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="py-10 px-5"
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="container bg-white p-5 sm:p-10 rounded-md shadow-sm"
      >
        <div className="flex items-center gap-3">
          <BackButton />
          <h1 className="text-lg font-medium">
            {CommonUtils.keyIntoTitle(slug)}
          </h1>
        </div>
        {content ? (
          <div className="mt-3 flex items-start gap-3">
            <div className="w-[20px] shrink-0 hidden sm:block"></div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="prose prose-slate max-w-none text-sm md:text-base"
              dangerouslySetInnerHTML={{
                __html: content || "<p>Content not found.</p>",
              }}
            />
          </div>
        ) : (
          <NoDataFound />
        )}
      </motion.div>
    </motion.div>
  );
};

export default page;
