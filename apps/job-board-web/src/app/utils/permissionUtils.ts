import useUserStore from '../store/useUserStore';
import { Roles } from '../types/enum';

class PermissionUtils {
  hasPermission(permission: string) {
    if (!permission) return true;

    const user = useUserStore.getState().user;
    if (user?.role !== Roles.employer) return true;

    return !!user?.permissions?.includes(permission);
  }
}

const permissionUtils = new PermissionUtils();
export default permissionUtils;
