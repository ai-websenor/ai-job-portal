'use client';

import { Button, Input } from '@heroui/react';

const JobSearchRightSection = () => {
  return (
    <div className="max-w-full sm:max-w-[300px] h-fit grid gap-6 sticky top-24">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
        <div className="w-12 h-12 bg-secondary rounded-xl flex items-center justify-center mb-4 text-2xl">
          📨
        </div>
        <p className="font-bold text-gray-800 text-lg">Email me for jobs</p>
        <p className="text-sm text-gray-500 mt-2 leading-relaxed">
          Get daily job alerts directly to your inbox. Never miss an opportunity.
        </p>
        <Input
          size="md"
          placeholder="name@mail.com"
          className="mt-4"
          classNames={{
            inputWrapper: 'bg-gray-50 border-gray-200',
          }}
        />
        <Button
          size="md"
          color="primary"
          className="mt-3 w-full font-medium shadow-lg shadow-primary/20"
        >
          Subscribe
        </Button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-lg text-primary">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-2xl backdrop-blur-sm">
          🚀
        </div>
        <p className="font-bold text-lg">Get noticed faster</p>
        <p className="text-sm text-primary mt-2 leading-relaxed">
          Upload your resume and let top recruiters find you for your dream role.
        </p>
        <Button size="md" color="primary" fullWidth className="mt-3">
          Upload Resume
        </Button>
      </div>
    </div>
  );
};

export default JobSearchRightSection;
