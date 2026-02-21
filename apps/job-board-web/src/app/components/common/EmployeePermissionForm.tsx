import { memberPermissions } from "@/app/config/data";
import { Checkbox, CheckboxGroup } from "@heroui/react";
import { Control, Controller } from "react-hook-form";

const EmployeePermissionGroup = ({ control }: { control: Control<any> }) => {
  return (
    <div className="flex flex-col gap-8">
      <Controller
        name="permissions"
        control={control}
        render={({ field: { onChange, value } }) => {
          const allPermissionValues = memberPermissions.flatMap((group) =>
            group.permissions.map((p) => p.value),
          );
          const isAllSelected = value?.length === allPermissionValues.length;
          const isIndeterminate =
            value?.length > 0 && value?.length < allPermissionValues.length;

          const handleSelectAll = (checked: boolean) => {
            if (checked) {
              onChange(allPermissionValues);
            } else {
              onChange([]);
            }
          };

          return (
            <div className="space-y-10">
              <div className="flex items-center justify-between pb-4 border-b border-divider">
                <h3 className="text-lg font-bold text-foreground">
                  All Permissions
                </h3>
                <Checkbox
                  isSelected={isAllSelected}
                  isIndeterminate={isIndeterminate}
                  onValueChange={handleSelectAll}
                  color="primary"
                  className="font-medium"
                >
                  Select All
                </Checkbox>
              </div>

              {memberPermissions.map((group) => {
                const groupValues = group.permissions.map((p) => p.value);
                const isGroupAllSelected = groupValues.every((val: string) =>
                  value?.includes(val),
                );
                const isGroupIndeterminate =
                  groupValues.some((val: string) => value?.includes(val)) &&
                  !isGroupAllSelected;

                const handleSelectGroup = (checked: boolean) => {
                  const otherValues = (value || []).filter(
                    (val: string) => !groupValues.includes(val),
                  );
                  if (checked) {
                    onChange([...otherValues, ...groupValues]);
                  } else {
                    onChange(otherValues);
                  }
                };

                return (
                  <div key={group.title} className="space-y-5">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-semibold text-foreground">
                        {group.title}
                      </h3>
                      <Checkbox
                        isSelected={isGroupAllSelected}
                        isIndeterminate={isGroupIndeterminate}
                        onValueChange={handleSelectGroup}
                        size="sm"
                        color="primary"
                      >
                        Select All
                      </Checkbox>
                    </div>
                    <CheckboxGroup
                      value={value || []}
                      onValueChange={onChange}
                      color="primary"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {group.permissions.map((permission) => (
                          <Checkbox
                            key={permission.value}
                            value={permission.value}
                            classNames={{
                              base: "max-w-full w-full items-start gap-3",
                              label: "w-full",
                              wrapper: "mt-1",
                            }}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm font-medium text-foreground">
                                {permission.title}
                              </span>
                              <span className="text-xs text-default-500">
                                {permission.description}
                              </span>
                            </div>
                          </Checkbox>
                        ))}
                      </div>
                    </CheckboxGroup>
                  </div>
                );
              })}
            </div>
          );
        }}
      />
    </div>
  );
};

export default EmployeePermissionGroup;
