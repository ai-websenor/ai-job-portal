'use client';

import Image from 'next/image';
import { Input, Textarea, Button } from '@heroui/react';
import { motion } from 'framer-motion';
import APP_CONFIG from '@/app/config/config';

const page = () => {
  return (
    <>
      <title>Contact Us | {APP_CONFIG.APP_NAME}</title>
      <div className="bg-white overflow-hidden">
        <div className="container mx-auto px-6 py-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16 md:mb-24"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#1F2937] mb-6">
              Contact Us
            </h1>
            <p className="text-[#6B7280] text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              Blessing welcomed ladyship she met humoured sir breeding her. Six curiosity day
              assurance bed necessary.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="w-full max-w-lg mx-auto lg:mx-0"
            >
              <div className="space-y-6">
                <Input
                  label="Name"
                  placeholder="Maya"
                  labelPlacement="inside"
                  variant="flat"
                  radius="sm"
                  className="w-full"
                />
                <Input
                  label="Email"
                  placeholder="Email"
                  labelPlacement="inside"
                  variant="flat"
                  radius="sm"
                  className="w-full"
                />
                <Textarea
                  label="Message"
                  placeholder="Message"
                  labelPlacement="inside"
                  variant="flat"
                  radius="sm"
                  className="w-full"
                  minRows={6}
                />
                <Button className="bg-[#7C7EF1] hover:bg-[#6D28D9] text-white px-10 py-7 rounded-lg font-bold text-sm shadow-xl shadow-[#7C7EF1]/20 transition-all active:scale-95">
                  Send Message
                </Button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="relative w-full flex justify-center lg:justify-end"
            >
              <div className="relative w-full max-w-[750px]">
                <Image
                  src="/assets/images/contact-us.png"
                  alt="Global map"
                  width={750}
                  height={600}
                  className="w-full h-auto object-contain"
                  priority
                />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </>
  );
};

export default page;
