'use client';

import { motion } from 'framer-motion';
import BackButton from '@/app/components/lib/BackButton';
import CommonUtils from '@/app/utils/commonUtils';
import NoDataFound from '@/app/components/lib/NoDataFound';
import { use, useEffect, useState } from 'react';
import http from '@/app/api/http';
import ENDPOINTS from '@/app/api/endpoints';
import LoadingProgress from '@/app/components/lib/LoadingProgress';

const page = ({ params }: { params: Promise<{ slug: string }> }) => {
  const { slug } = use(params);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  const getDetails = async () => {
    try {
      setLoading(true);
      const res = await http.get(ENDPOINTS.CMS.GET(slug));
      setContent(res?.data?.content);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDetails();
  }, []);

  return (
    <>
      <title>{CommonUtils.keyIntoTitle(slug)}</title>

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
            <h1 className="text-lg font-medium">{CommonUtils.keyIntoTitle(slug)}</h1>
          </div>

          {loading ? (
            <LoadingProgress />
          ) : content ? (
            <div className="mt-3 flex items-start gap-3">
              <div className="w-[20px] shrink-0 hidden sm:block"></div>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="prose prose-slate max-w-none text-sm md:text-base"
                dangerouslySetInnerHTML={{
                  __html: content || '<p>Content not found.</p>',
                }}
              />
            </div>
          ) : (
            <NoDataFound />
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

export default page;
