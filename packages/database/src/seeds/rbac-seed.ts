import { createDatabaseClient } from '../client';
import { roles, permissions, rolePermissions, userRoles, users, adminUsers } from '../schema';
import { eq, and } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables - try multiple locations
const envPath = path.resolve(__dirname, '../../../.env');
dotenv.config({ path: envPath });

// If DATABASE_URL is not set, try local .env in database package
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

interface PermissionDefinition {
  code: string;
  resource: string;
  action: string;
  description: string;
}

interface RoleDefinition {
  name: string;
  description: string;
  isSystemRole: boolean;
  permissions: string[];
}

// Define all permissions
const PERMISSIONS: PermissionDefinition[] = [
  // Admin Panel Access
  {
    code: 'ACCESS_ADMIN_PANEL',
    resource: 'admin',
    action: 'access',
    description: 'Access to admin panel dashboard',
  },

  // Company Management
  {
    code: 'CREATE_COMPANY',
    resource: 'company',
    action: 'create',
    description: 'Create new companies',
  },
  {
    code: 'UPDATE_COMPANY',
    resource: 'company',
    action: 'update',
    description: 'Update company information',
  },
  {
    code: 'DELETE_COMPANY',
    resource: 'company',
    action: 'delete',
    description: 'Delete companies',
  },
  {
    code: 'VIEW_COMPANY',
    resource: 'company',
    action: 'view',
    description: 'View company details',
  },

  // Admin Management
  {
    code: 'CREATE_ADMIN',
    resource: 'admin',
    action: 'create',
    description: 'Create new admin users',
  },
  {
    code: 'UPDATE_ADMIN',
    resource: 'admin',
    action: 'update',
    description: 'Update admin user information',
  },
  {
    code: 'DELETE_ADMIN',
    resource: 'admin',
    action: 'delete',
    description: 'Delete admin users',
  },

  // Employer Management
  {
    code: 'CREATE_EMPLOYER',
    resource: 'employer',
    action: 'create',
    description: 'Create new employer accounts',
  },
  {
    code: 'UPDATE_EMPLOYER',
    resource: 'employer',
    action: 'update',
    description: 'Update employer information',
  },
  {
    code: 'DELETE_EMPLOYER',
    resource: 'employer',
    action: 'delete',
    description: 'Delete employer accounts',
  },

  // Job Management
  {
    code: 'CREATE_JOB',
    resource: 'job',
    action: 'create',
    description: 'Create new job postings',
  },
  {
    code: 'UPDATE_JOB',
    resource: 'job',
    action: 'update',
    description: 'Update job postings',
  },
  {
    code: 'DELETE_JOB',
    resource: 'job',
    action: 'delete',
    description: 'Delete job postings',
  },
  {
    code: 'VIEW_JOB',
    resource: 'job',
    action: 'view',
    description: 'View job details',
  },
  {
    code: 'MODERATE_JOB',
    resource: 'job',
    action: 'moderate',
    description: 'Moderate and approve/reject jobs',
  },

  // User Management
  {
    code: 'MANAGE_USERS',
    resource: 'user',
    action: 'manage',
    description: 'Full user management capabilities',
  },
  {
    code: 'VIEW_USERS',
    resource: 'user',
    action: 'view',
    description: 'View user information',
  },
  {
    code: 'UPDATE_USERS',
    resource: 'user',
    action: 'update',
    description: 'Update user information',
  },
  {
    code: 'DELETE_USERS',
    resource: 'user',
    action: 'delete',
    description: 'Delete user accounts',
  },

  // Application Management
  {
    code: 'VIEW_APPLICATIONS',
    resource: 'application',
    action: 'view',
    description: 'View job applications',
  },
  {
    code: 'MANAGE_APPLICATIONS',
    resource: 'application',
    action: 'manage',
    description: 'Manage job applications',
  },

  // Role Management
  {
    code: 'MANAGE_ROLES',
    resource: 'role',
    action: 'manage',
    description: 'Create and manage roles',
  },
  {
    code: 'ASSIGN_ROLES',
    resource: 'role',
    action: 'assign',
    description: 'Assign roles to users',
  },

  // System Settings
  {
    code: 'MANAGE_SETTINGS',
    resource: 'settings',
    action: 'manage',
    description: 'Manage system settings',
  },
];

// Define roles and their permissions
const ROLES: RoleDefinition[] = [
  {
    name: 'SUPER_ADMIN',
    description: 'Full system access with all permissions',
    isSystemRole: true,
    permissions: PERMISSIONS.map(p => p.code), // ALL permissions
  },
  {
    name: 'ADMIN',
    description: 'Admin panel access with limited permissions',
    isSystemRole: true,
    permissions: [
      'ACCESS_ADMIN_PANEL',
      'CREATE_EMPLOYER',
      'UPDATE_EMPLOYER',
      'VIEW_COMPANY',
      'UPDATE_COMPANY',
      'VIEW_USERS',
      'UPDATE_USERS',
      'MANAGE_USERS',
      'VIEW_JOB',
      'MODERATE_JOB',
      'VIEW_APPLICATIONS',
    ],
  },
  {
    name: 'EMPLOYER',
    description: 'Employer with job management permissions',
    isSystemRole: true,
    permissions: [
      'CREATE_JOB',
      'UPDATE_JOB',
      'DELETE_JOB',
      'VIEW_JOB',
      'VIEW_APPLICATIONS',
      'MANAGE_APPLICATIONS',
      'VIEW_COMPANY',
      'UPDATE_COMPANY',
    ],
  },
  {
    name: 'MODERATOR',
    description: 'Content moderator with limited admin access',
    isSystemRole: true,
    permissions: [
      'ACCESS_ADMIN_PANEL',
      'VIEW_JOB',
      'MODERATE_JOB',
      'VIEW_COMPANY',
      'VIEW_USERS',
      'VIEW_APPLICATIONS',
    ],
  },
];

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  console.log('🌱 Starting RBAC seed...');
  console.log('📦 Connecting to database...');

  const db = createDatabaseClient(databaseUrl);

  try {
    // Step 1: Create permissions
    console.log('\n📋 Creating permissions...');
    const permissionMap = new Map<string, string>(); // code -> id

    for (const perm of PERMISSIONS) {
      const [existing] = await db
        .select()
        .from(permissions)
        .where(eq(permissions.code, perm.code))
        .limit(1);

      if (existing) {
        console.log(`  ✓ Permission exists: ${perm.code}`);
        permissionMap.set(perm.code, existing.id);
      } else {
        const [created] = await db
          .insert(permissions)
          .values(perm)
          .returning();
        console.log(`  ✅ Created permission: ${perm.code}`);
        permissionMap.set(perm.code, created.id);
      }
    }

    // Step 2: Create roles
    console.log('\n👥 Creating roles...');
    const roleMap = new Map<string, string>(); // name -> id

    for (const role of ROLES) {
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, role.name))
        .limit(1);

      if (existing) {
        console.log(`  ✓ Role exists: ${role.name}`);
        roleMap.set(role.name, existing.id);
      } else {
        const [created] = await db
          .insert(roles)
          .values({
            name: role.name,
            description: role.description,
            isSystemRole: role.isSystemRole,
          })
          .returning();
        console.log(`  ✅ Created role: ${role.name}`);
        roleMap.set(role.name, created.id);
      }
    }

    // Step 3: Assign permissions to roles
    console.log('\n🔗 Assigning permissions to roles...');

    for (const role of ROLES) {
      const roleId = roleMap.get(role.name);
      if (!roleId) continue;

      for (const permCode of role.permissions) {
        const permId = permissionMap.get(permCode);
        if (!permId) continue;

        const [existing] = await db
          .select()
          .from(rolePermissions)
          .where(
            and(
              eq(rolePermissions.roleId, roleId),
              eq(rolePermissions.permissionId, permId)
            )
          )
          .limit(1);

        if (!existing) {
          await db.insert(rolePermissions).values({
            roleId,
            permissionId: permId,
          });
        }
      }

      console.log(`  ✅ Assigned ${role.permissions.length} permissions to ${role.name}`);
    }

    // Step 4: Migrate existing admin users
    console.log('\n🔄 Migrating existing admin users...');

    const adminUsersList = await db
      .select({
        adminUserId: adminUsers.id,
        userId: adminUsers.userId,
        adminRole: adminUsers.role,
      })
      .from(adminUsers)
      .where(eq(adminUsers.isActive, true));

    console.log(`  Found ${adminUsersList.length} admin users to migrate`);

    for (const adminUser of adminUsersList) {
      // Map old admin role to new RBAC role
      let rbacRoleName: string;
      let shouldSetSuperAdmin = false;
      let shouldSetAdmin = false;

      switch (adminUser.adminRole) {
        case 'super_admin':
          rbacRoleName = 'SUPER_ADMIN';
          shouldSetSuperAdmin = true;
          shouldSetAdmin = true;
          break;
        case 'admin':
          rbacRoleName = 'ADMIN';
          shouldSetAdmin = true;
          break;
        case 'moderator':
          rbacRoleName = 'MODERATOR';
          shouldSetAdmin = true;
          break;
        case 'support':
          rbacRoleName = 'ADMIN'; // Map support to ADMIN
          shouldSetAdmin = true;
          break;
        default:
          console.log(`  ⚠️  Unknown admin role: ${adminUser.adminRole}, skipping`);
          continue;
      }

      const roleId = roleMap.get(rbacRoleName);
      if (!roleId) {
        console.log(`  ⚠️  RBAC role not found: ${rbacRoleName}, skipping`);
        continue;
      }

      // Check if user_role already exists
      const [existingUserRole] = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, adminUser.userId),
            eq(userRoles.roleId, roleId)
          )
        )
        .limit(1);

      if (!existingUserRole) {
        await db.insert(userRoles).values({
          userId: adminUser.userId,
          roleId,
          grantedBy: null, // System migration
          isActive: true,
        });
        console.log(`  ✅ Assigned ${rbacRoleName} role to user ${adminUser.userId}`);
      } else {
        console.log(`  ✓ User ${adminUser.userId} already has ${rbacRoleName} role`);
      }

      // Update user flags
      await db
        .update(users)
        .set({
          isSuperAdmin: shouldSetSuperAdmin,
          isAdmin: shouldSetAdmin,
        })
        .where(eq(users.id, adminUser.userId));

      console.log(`  ✅ Updated flags for user ${adminUser.userId} (isSuperAdmin: ${shouldSetSuperAdmin}, isAdmin: ${shouldSetAdmin})`);
    }

    console.log('\n✨ RBAC seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Permissions created: ${PERMISSIONS.length}`);
    console.log(`  - Roles created: ${ROLES.length}`);
    console.log(`  - Admin users migrated: ${adminUsersList.length}`);

  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  } finally {
    process.exit(0);
  }
}

// Run seed
seed();
