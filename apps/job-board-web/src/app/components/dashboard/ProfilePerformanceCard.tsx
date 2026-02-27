'use client';

import { Card, CardBody, Chip } from '@heroui/react';
import { FaEye, FaUserTie, FaDownload, FaFileAlt } from 'react-icons/fa';
import { HiTrendingUp } from 'react-icons/hi';

const ProfilePerformanceCard = () => {
  return (
    <Card className="w-full bg-white shadow-sm border border-gray-100 p-4">
      <CardBody className="gap-6 p-2 sm:p-4">
        <div className="flex flex-col gap-1">
          <h3 className="font-bold text-gray-800 text-lg">Profile Performance</h3>
          <p className="text-xs text-gray-500">Track your visibility and impact</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-primary shadow-sm group-hover:scale-110 transition-transform">
                <FaEye size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Profile Views
                </span>
                <span className="text-xl font-bold text-gray-800">152</span>
              </div>
            </div>
            <Chip size="sm" variant="flat" color="success" className="text-xs font-medium">
              +12%
            </Chip>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-primary shadow-sm group-hover:scale-110 transition-transform">
                <FaUserTie size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recruiter Actions
                </span>
                <span className="text-xl font-bold text-gray-800">7</span>
              </div>
            </div>
            <Chip size="sm" color="primary" variant="flat" className="text-xs font-medium">
              +2
            </Chip>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl text-orange-600 shadow-sm group-hover:scale-110 transition-transform">
                <FaDownload size={20} />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Resume Downloads
                </span>
                <span className="text-xl font-bold text-gray-800">23</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-5 rounded-2xl flex flex-col gap-4 text-white shadow-lg">
          <div className="flex items-center gap-2 text-white/90">
            <FaFileAlt />
            <span className="font-semibold text-sm">Application Stats</span>
          </div>
          <div className="grid xl:grid-cols-3 gap-3 text-center">
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-[10px] text-gray-300 mb-1 uppercase tracking-wider">
                Submitted
              </div>
              <div className="font-bold text-lg">15</div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-[10px] text-gray-300 mb-1 uppercase tracking-wider">
                Shortlisted
              </div>
              <div className="font-bold text-lg">4</div>
            </div>
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
              <div className="text-[10px] text-gray-300 mb-1 uppercase tracking-wider">
                Rejected
              </div>
              <div className="font-bold text-lg">3</div>
            </div>
          </div>
        </div>

        <div className="text-center pt-2">
          <a
            href="#"
            className="text-xs text-primary flex items-center justify-center gap-1.5 font-bold hover:underline transition-all"
          >
            <HiTrendingUp className="text-lg" /> Get 3X boost to your profile
          </a>
        </div>
      </CardBody>
    </Card>
  );
};

export default ProfilePerformanceCard;
