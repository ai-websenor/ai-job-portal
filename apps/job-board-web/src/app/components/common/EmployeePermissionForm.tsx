'use client';

import ENDPOINTS from '@/app/api/endpoints';
import http from '@/app/api/http';
import { IPermission } from '@/app/types/types';
import { Checkbox, Chip } from '@heroui/react';
import { useEffect, useMemo, useState } from 'react';
import LoadingProgress from '../lib/LoadingProgress';
import { useWatch } from 'react-hook-form';
import { useParams } from 'next/navigation';

type PermissionValue = {
  permissionId: string;
  isEnabled: boolean;
};

type PermissionGroup = {
  resource: string;
  title: string;
  permissions: IPermission[];
};

const formatPermissionLabel = (value: string) =>
  value
    .split(/[-_]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

const getPermissionsFromResponse = (response: any): IPermission[] => {
  if (Array.isArray(response?.data)) {
    return response.data;
  }

  if (Array.isArray(response)) {
    return response;
  }

  return [];
};

const EmployeePermissionGroup = ({
  control,
  errors,
  setValue,
}: {
  control: any;
  errors: any;
  setValue: any;
}) => {
  const { id } = useParams<{ id?: string }>();
  const [loading, setLoading] = useState(false);
  const watchedValues = useWatch({ control }) || {};
  const permissionIds = (watchedValues.permissionIds || []) as PermissionValue[];
  const [allPermissions, setAllPermissions] = useState<IPermission[]>([]);

  const getAllPermissions = async () => {
    try {
      setLoading(true);
      const response = await http.get(ENDPOINTS.EMPLOYER.PERMISSIONS.GET_ALL);
      setAllPermissions(getPermissionsFromResponse(response));
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
      const data = getPermissionsFromResponse(response);
      if (data.length > 0) {
        const assignedPermissions = data?.map((ev: any) => ({
          permissionId: ev.permissionId || ev.id,
          isEnabled: ev?.isEnabled,
        }));
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
    if (id) {
      getEmployeePermissions();
    }
  }, [id]);

  const activePermissions = useMemo(
    () => allPermissions.filter((permission) => permission.isEnabled !== false),
    [allPermissions],
  );

  const groupedPermissions = useMemo(() => {
    const grouped = activePermissions.reduce<Record<string, PermissionGroup>>((acc, permission) => {
      const resource = permission.resource || 'general';

      if (!acc[resource]) {
        acc[resource] = {
          resource,
          title: formatPermissionLabel(resource),
          permissions: [],
        };
      }

      acc[resource].permissions.push(permission);

      return acc;
    }, {});

    return Object.values(grouped);
  }, [activePermissions]);

  const selectedPermissionIds = useMemo(
    () =>
      new Set(
        permissionIds
          .filter((permission) => permission.isEnabled)
          .map((permission) => permission.permissionId),
      ),
    [permissionIds],
  );

  const selectedCount = activePermissions.filter((permission) =>
    selectedPermissionIds.has(permission.id),
  ).length;

  const isAllSelected = activePermissions.length > 0 && selectedCount === activePermissions.length;

  const getSelectedCount = (permissions: IPermission[]) =>
    permissions.filter((permission) => selectedPermissionIds.has(permission.id)).length;

  const handleSelect = (checked: boolean, id: string) => {
    const currentValues = permissionIds || [];
    const exists = currentValues.some((p) => p.permissionId === id);
    let newValues;
    if (exists) {
      newValues = currentValues.map((p) =>
        p.permissionId === id ? { ...p, isEnabled: checked } : p,
      );
    } else {
      newValues = [...currentValues, { permissionId: id, isEnabled: checked }];
    }
    setValue('permissionIds', newValues, { shouldValidate: true });
  };

  const handleSelectAll = (checked: boolean) => {
    const newValues = activePermissions.map((p) => ({
      permissionId: p.id,
      isEnabled: checked,
    }));
    setValue('permissionIds', newValues, { shouldValidate: true });
  };

  const handleSelectGroup = (checked: boolean, permissions: IPermission[]) => {
    const groupPermissionIds = new Set(permissions.map((permission) => permission.id));
    const remainingValues = permissionIds.filter(
      (permission) => !groupPermissionIds.has(permission.permissionId),
    );
    const groupValues = permissions.map((permission) => ({
      permissionId: permission.id,
      isEnabled: checked,
    }));

    setValue('permissionIds', [...remainingValues, ...groupValues], { shouldValidate: true });
  };

  return (
    <div className="flex flex-col gap-6">
      {loading ? (
        <LoadingProgress />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 rounded-lg border border-default-200 bg-default-50/60 p-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground">Permissions</h3>
              <p className="text-sm text-default-500">
                {selectedCount} of {activePermissions.length} permissions selected
              </p>
            </div>
            <Checkbox
              color="primary"
              className="shrink-0 font-medium"
              isSelected={isAllSelected}
              onChange={(ev) => handleSelectAll(ev.target.checked)}
            >
              Select all permissions
            </Checkbox>
          </div>

          {groupedPermissions.length > 0 ? (
            <div className="grid gap-5">
              {groupedPermissions.map((group) => {
                const selectedInGroup = getSelectedCount(group.permissions);
                const isGroupSelected =
                  group.permissions.length > 0 && selectedInGroup === group.permissions.length;

                return (
                  <section
                    key={group.resource}
                    className="overflow-hidden rounded-lg border border-default-200 bg-white"
                  >
                    <div className="flex flex-col gap-3 border-b border-default-200 bg-default-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex min-w-0 flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="min-w-0 break-words text-base font-semibold text-foreground">
                            {group.title}
                          </h4>
                          <Chip size="sm" variant="flat" color="primary" className="shrink-0">
                            {group.permissions.length}
                          </Chip>
                        </div>
                        <p className="text-xs text-default-500">
                          {selectedInGroup} of {group.permissions.length} selected
                        </p>
                      </div>

                      <Checkbox
                        color="primary"
                        size="sm"
                        className="shrink-0 font-medium"
                        isSelected={isGroupSelected}
                        onChange={(ev) => handleSelectGroup(ev.target.checked, group.permissions)}
                      >
                        Select group
                      </Checkbox>
                    </div>

                    <div className="grid min-w-0 grid-cols-1 gap-3 p-4 lg:grid-cols-2">
                      {group.permissions.map((permission) => {
                        const isSelected = selectedPermissionIds.has(permission.id);
                        const permissionTitle =
                          permission.description || formatPermissionLabel(permission.action);

                        return (
                          <div
                            key={permission.id}
                            className={`flex min-h-[76px] min-w-0 items-start gap-3 rounded-lg border p-3 transition-colors ${
                              isSelected
                                ? 'border-primary bg-primary/5'
                                : 'border-default-200 bg-white hover:border-primary/50'
                            }`}
                          >
                            <Checkbox
                              aria-label={permissionTitle}
                              color="primary"
                              classNames={{
                                base: 'm-0 shrink-0 p-0',
                                wrapper: 'mt-0',
                              }}
                              isSelected={isSelected}
                              onChange={(ev) => handleSelect(ev.target.checked, permission.id)}
                            />
                            <div className="flex min-w-0 flex-1 flex-col gap-1">
                              <span className="break-words text-sm font-medium leading-5 text-foreground">
                                {permissionTitle}
                              </span>
                              <span className="break-words text-xs font-medium uppercase text-default-500">
                                {formatPermissionLabel(permission.action)}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-default-500 py-5">No permissions found</p>
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
