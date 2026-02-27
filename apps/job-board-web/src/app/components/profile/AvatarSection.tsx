'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import useGetProfile from '@/app/hooks/useGetProfile';
import { IAvatar } from '@/app/types/types';
import { Avatar, Card, CardBody, Input } from '@heroui/react';
import { useEffect, useState } from 'react';
import LoadingProgress from '../lib/LoadingProgress';
import ConfirmationDialog from '../dialogs/ConfirmationDialog';
import useUserStore from '@/app/store/useUserStore';
import { Gender, Roles } from '@/app/types/enum';
import CommonUtils from '@/app/utils/commonUtils';
import clsx from 'clsx';
import { IoIosSearch } from 'react-icons/io';

const AvatarSection = ({ role }: { role: Roles }) => {
  const { user } = useUserStore();
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState(Gender.male);
  const [avatars, setAvatars] = useState<IAvatar[]>([]);
  const [debounceTime, setDebounceTime] = useState<NodeJS.Timeout | null>(null);

  const [confirmModal, setConfirmModal] = useState({
    show: false,
    avatarId: '',
  });

  const handleSearch = (query: string) => {
    if (debounceTime) {
      clearTimeout(debounceTime);
    }

    setDebounceTime(
      setTimeout(() => {
        getAvatars(query?.trim());
      }, 1500),
    );
  };

  const getAvatars = async (search?: string) => {
    const url = role === Roles.candidate ? ENDPOINTS.AVATARS.LIST : ENDPOINTS.EMPLOYER.AVATARS.LIST;

    try {
      setLoading(true);
      const response = await http.get(url, {
        params: { gender, search },
      });
      if (response?.data) {
        setAvatars(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAvatars();
  }, [gender]);

  const handleChooseAvatar = async (avatarId: string) => {
    const url =
      role === Roles.candidate ? ENDPOINTS.AVATARS.CHOOSE : ENDPOINTS.EMPLOYER.AVATARS.CHOOSE;

    try {
      setLoading(true);
      await http.post(url, { avatarId });
      getProfile();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-none border border-gray-100 bg-white">
      <CardBody className="p-4">
        <h3 className="text-sm text-center font-bold text-gray-900 mb-3">Choose Avatar</h3>

        <div className="flex flex-col gap-3 mb-4">
          <div className="flex justify-center gap-1 items-center">
            {Object.values(Gender).map((item) => (
              <button
                key={item}
                onClick={() => setGender(item)}
                className={clsx(
                  'text-[10px] py-0.5 px-3 hover:bg-secondary rounded-lg text-primary',
                  gender === item && 'bg-secondary border border-primary',
                )}
              >
                {CommonUtils.keyIntoTitle(item)}
              </button>
            ))}
          </div>

          <Input
            size="sm"
            placeholder="Search by name"
            onChange={(ev) => handleSearch(ev.target.value)}
            endContent={<IoIosSearch size={17} className="text-gray-400" />}
          />
        </div>

        {loading ? (
          <LoadingProgress />
        ) : avatars?.length > 0 ? (
          <div className="grid grid-cols-4 gap-4">
            {avatars.map((avatar) => (
              <div
                key={avatar.id}
                onClick={() =>
                  setConfirmModal({
                    show: true,
                    avatarId: avatar.id,
                  })
                }
                className="cursor-pointer group relative flex flex-col items-center justify-center"
              >
                <Avatar
                  color="primary"
                  src={avatar.imageUrl}
                  isBordered={avatar.imageUrl === user?.profilePhoto}
                  className="w-14 h-14 transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                />
                <p className="text-xs font-medium">{avatar.name}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-center text-default-400">No Avatar found</p>
        )}
      </CardBody>

      {confirmModal.show && (
        <ConfirmationDialog
          isOpen={confirmModal.show}
          onClose={() => setConfirmModal({ show: false, avatarId: '' })}
          onConfirm={() => handleChooseAvatar(confirmModal.avatarId)}
          title="Confirm Avatar"
          message="Are you sure you want to change your avatar?"
          color="primary"
        />
      )}
    </Card>
  );
};

export default AvatarSection;
