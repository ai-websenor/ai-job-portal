'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { IPermission } from '@/app/types/types';
import { Checkbox } from '@heroui/react';
import { useEffect, useState } from 'react';
import LoadingProgress from '../lib/LoadingProgress';
import { useWatch } from 'react-hook-form';
import { useParams } from 'next/navigation';

const EmployeePermissionGroup = ({
  control,
  errors,
  setValue,
}: {
  control: any;
  errors: any;
  setValue: any;
}) => {
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const { permissionIds } = useWatch({ control });
  const [allPermissions, setAllPermissions] = useState<IPermission[]>([]);

  const getAllPermissions = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.PERMISSIONS.GET_ALL);
      if (response?.data) {
        setAllPermissions(response?.data);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const getEmployeePermissions = async () => {
    try {
      setLoading(true);
      const response = await http.get(
        ENDPOINTS.EMPLOYER.PERMISSIONS.PERMISSIONS_BY_MEMBER(id as any),
      );
      const data = response?.data;
      if (data) {
        const assignedPermissions = data?.map((ev: any) => ev.id);
        setValue('permissionIds', assignedPermissions);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAllPermissions();
    getEmployeePermissions();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {loading ? (
        <LoadingProgress />
      ) : (
        <div>
          <div className="flex items-center justify-between pb-2 border-b border-divider">
            <h3 className="text-lg font-bold text-foreground">All Permissions</h3>
            <Checkbox color="primary" className="font-medium">
              Select All
            </Checkbox>
          </div>
          {allPermissions?.length > 0 ? (
            <div className="grid sm:grid-cols-3 gap-5 mt-5">
              {allPermissions?.map((permission) => {
                return (
                  <Checkbox
                    key={permission.id}
                    classNames={{
                      base: 'max-w-full w-full items-start gap-3',
                      label: 'w-full',
                      wrapper: 'mt-1',
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-foreground">
                        {permission.description}
                      </span>
                      <span className="text-xs text-default-500 capitalize">
                        {permission.resource}
                      </span>
                    </div>
                  </Checkbox>
                );
              })}
            </div>
          ) : (
            <p className="mt-5 text-sm text-center text-gray-600 py-5">No allPermissions found</p>
          )}
        </div>
      )}
      {errors?.permissionIds && (
        <p className="text-tiny text-danger">{errors?.permissionIds?.message}</p>
      )}
    </div>
  );
};

export default EmployeePermissionGroup;
