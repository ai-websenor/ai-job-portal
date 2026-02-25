'use client';

import {
  Card,
  CardBody,
  Avatar,
  Chip,
  Button,
  Divider,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
} from '@heroui/react';
import {
  IoBusinessOutline,
  IoWalletOutline,
  IoBriefcaseOutline,
  IoChatbubbleOutline,
  IoOpenOutline,
  IoDownloadOutline,
  IoChevronDown,
} from 'react-icons/io5';
import { VideoResumeStatus } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import { useRouter } from 'next/navigation';
import routePaths from '@/app/config/routePaths';

type Props = {
  name: string;
  role: string;
  company: string;
  salary: string;
  experience: string;
  status: VideoResumeStatus;
  avatar?: string;
};

const ShortlistedCard = ({ name, role, company, salary, experience, status, avatar }: Props) => {
  const router = useRouter();

  const onActionClick = (action: string) => {
    switch (action) {
      case 'Chat':
        router.push(routePaths.chat.chatDetail('sdf'));
        break;
      case 'View Profile':
        router.push(routePaths.employee.jobs.applicantProfile('sdf', 'sdf'));
        break;
      case 'Download Resume':
        router.push(routePaths.employee.jobs.applicantProfile('sdf', 'asdf'));
        break;
    }
  };

  return (
    <Card className="w-full border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300 bg-white">
      <CardBody className="p-6">
        <div className="flex gap-4 items-center mb-6">
          <Avatar
            src={avatar || `https://i.pravatar.cc/150?img=7`}
            name={name}
            className="w-16 h-16 text-2xl font-semibold bg-gray-50 text-primary border border-gray-100 shadow-sm"
            radius="full"
          />
          <div className="flex flex-col">
            <h3 className="text-lg font-medium text-gray-900 leading-tight">{name}</h3>
            <p className="text-sm text-gray-500">{role}</p>
          </div>
        </div>

        <div className="space-y-3.5 mb-6 px-1">
          <div className="flex items-center gap-3 text-gray-400">
            <IoBusinessOutline className="text-lg flex-shrink-0" />
            <span className="text-sm sm:text-[15px] font-medium text-gray-500">{company}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <IoWalletOutline className="text-lg flex-shrink-0" />
            <span className="text-sm sm:text-[15px] font-medium text-gray-500">{salary}</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
            <IoBriefcaseOutline className="text-lg flex-shrink-0" />
            <span className="text-sm sm:text-[15px] font-medium text-gray-500">{experience}</span>
          </div>
        </div>

        <Divider className="my-5 bg-gray-100 opacity-60" />

        <div className="flex items-center justify-between">
          <Dropdown placement="bottom-start">
            <DropdownTrigger>
              <Chip
                size="sm"
                variant="flat"
                color={CommonUtils.getStatusColor(status)}
                className="capitalize font-semibold h-8 cursor-pointer hover:opacity-80 transition-opacity"
                endContent={<IoChevronDown className="ml-1 opacity-70" size={14} />}
              >
                {CommonUtils.keyIntoTitle(status)}
              </Chip>
            </DropdownTrigger>
            <DropdownMenu aria-label="Status Actions" variant="flat">
              {Object.values(VideoResumeStatus).map((item) => (
                <DropdownItem
                  key={item}
                  color={CommonUtils.getStatusColor(item)}
                  isDisabled={status === item}
                >
                  {CommonUtils.keyIntoTitle(item)}
                </DropdownItem>
              ))}
            </DropdownMenu>
          </Dropdown>

          <div className="flex gap-1">
            {footerActionButtons.map((item) => (
              <Button
                key={item.label}
                isIconOnly
                variant="light"
                className="text-gray-400 hover:text-primary transition-colors min-w-10 w-10 h-10"
                radius="full"
                onPress={() => onActionClick(item.label)}
              >
                <Tooltip size="sm" content={item.label} placement="top">
                  <item.icon size={20} />
                </Tooltip>
              </Button>
            ))}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default ShortlistedCard;

const footerActionButtons = [
  {
    icon: IoChatbubbleOutline,
    label: 'Chat',
    color: 'primary',
  },
  {
    icon: IoOpenOutline,
    label: 'View Profile',
    color: 'primary',
  },
  {
    icon: IoDownloadOutline,
    label: 'Download Resume',
    color: 'primary',
  },
];
