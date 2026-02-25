"use client";

import ENDPOINTS from "@/app/api/endpoints";
import http from "@/app/api/http";
import useGetProfile from "@/app/hooks/useGetProfile";
import { IAvatar } from "@/app/types/types";
import { Avatar, Card, CardBody, Tooltip } from "@heroui/react";
import { useEffect, useState } from "react";
import LoadingProgress from "../lib/LoadingProgress";
import ConfirmationDialog from "../dialogs/ConfirmationDialog";
import useUserStore from "@/app/store/useUserStore";

const AvatarSection = () => {
  const { user } = useUserStore();
  const { getProfile } = useGetProfile();
  const [loading, setLoading] = useState(false);
  const [avatars, setAvatars] = useState<IAvatar[]>([]);
  const [confirmModal, setConfirmModal] = useState({
    show: false,
    avatarId: "",
  });

  const getAvatars = async () => {
    try {
      const response = await http.get(ENDPOINTS.AVATARS.LIST);
      if (response?.data) {
        setAvatars(response?.data);
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    getAvatars();
  }, []);

  const handleChooseAvatar = async (avatarId: string) => {
    try {
      setLoading(true);
      await http.post(ENDPOINTS.AVATARS.CHOOSE, { avatarId });
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
        <h3 className="text-sm font-bold text-gray-900 mb-4">Choose Avatar</h3>
        {loading ? (
          <LoadingProgress />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {avatars.map((avatar) => (
              <Tooltip
                key={avatar.id}
                content={avatar.name}
                placement="top"
                closeDelay={0}
              >
                <div
                  onClick={() =>
                    setConfirmModal({
                      show: true,
                      avatarId: avatar.id,
                    })
                  }
                  className="cursor-pointer group relative flex justify-center"
                >
                  <Avatar
                    color="primary"
                    src={avatar.imageUrl}
                    isBordered={avatar.imageUrl === user?.profilePhoto}
                    className="w-12 h-12 transition-all duration-300 group-hover:scale-110 group-active:scale-95"
                  />
                </div>
              </Tooltip>
            ))}
          </div>
        )}
      </CardBody>

      {confirmModal.show && (
        <ConfirmationDialog
          isOpen={confirmModal.show}
          onClose={() => setConfirmModal({ show: false, avatarId: "" })}
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
