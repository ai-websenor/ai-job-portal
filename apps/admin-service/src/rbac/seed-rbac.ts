/**
 * Seed script to populate default roles and permissions
 * Run: pnpm tsx apps/admin-service/src/rbac/seed-rbac.ts
 */

import { createDatabaseClient } from '@ai-job-portal/database';
import { roles, permissions, rolePermissions } from '@ai-job-portal/database';
import { eq } from 'drizzle-orm';

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/ai_job_portal?sslmode=disable';

// Define all permissions
const DEFAULT_PERMISSIONS = [
  // Analytics
  {
    name: 'analytics:read',
    resource: 'analytics',
    action: 'read',
    description: 'View analytics and reports',
  },

  // Users
  { name: 'users:read', resource: 'users', action: 'read', description: 'View users' },
  { name: 'users:write', resource: 'users', action: 'write', description: 'Create and edit users' },
  { name: 'users:delete', resource: 'users', action: 'delete', description: 'Delete users' },

  // Companies
  { name: 'companies:read', resource: 'companies', action: 'read', description: 'View companies' },
  {
    name: 'companies:write',
    resource: 'companies',
    action: 'write',
    description: 'Create and edit companies',
  },
  {
    name: 'companies:delete',
    resource: 'companies',
    action: 'delete',
    description: 'Delete companies',
  },

  // Employers
  { name: 'employers:read', resource: 'employers', action: 'read', description: 'View employers' },
  {
    name: 'employers:write',
    resource: 'employers',
    action: 'write',
    description: 'Create and edit employers',
  },
  {
    name: 'employers:delete',
    resource: 'employers',
    action: 'delete',
    description: 'Delete employers',
  },

  // Candidates
  {
    name: 'candidates:read',
    resource: 'candidates',
    action: 'read',
    description: 'View candidates',
  },
  {
    name: 'candidates:write',
    resource: 'candidates',
    action: 'write',
    description: 'Edit candidates',
  },
  {
    name: 'candidates:delete',
    resource: 'candidates',
    action: 'delete',
    description: 'Delete candidates',
  },

  // Jobs (granular)
  { name: 'jobs:create', resource: 'jobs', action: 'create', description: 'Create job postings' },
  { name: 'jobs:read', resource: 'jobs', action: 'read', description: 'View job details' },
  { name: 'jobs:update', resource: 'jobs', action: 'update', description: 'Update job postings' },
  { name: 'jobs:delete', resource: 'jobs', action: 'delete', description: 'Delete job postings' },
  { name: 'jobs:list', resource: 'jobs', action: 'list', description: 'List all jobs' },
  {
    name: 'jobs:publish',
    resource: 'jobs',
    action: 'publish',
    description: 'Publish job postings',
  },
  {
    name: 'jobs:unpublish',
    resource: 'jobs',
    action: 'unpublish',
    description: 'Unpublish job postings',
  },
  {
    name: 'jobs:moderate',
    resource: 'jobs',
    action: 'moderate',
    description: 'Moderate job postings',
  },
  {
    name: 'jobs:write',
    resource: 'jobs',
    action: 'write',
    description: 'Create and edit jobs (legacy)',
  },

  // Applications (granular)
  {
    name: 'applications:create',
    resource: 'applications',
    action: 'create',
    description: 'Submit job applications',
  },
  {
    name: 'applications:read',
    resource: 'applications',
    action: 'read',
    description: 'View application details',
  },
  {
    name: 'applications:update',
    resource: 'applications',
    action: 'update',
    description: 'Update application status',
  },
  {
    name: 'applications:delete',
    resource: 'applications',
    action: 'delete',
    description: 'Delete job applications',
  },
  {
    name: 'applications:list',
    resource: 'applications',
    action: 'list',
    description: 'List all applications',
  },
  {
    name: 'applications:review',
    resource: 'applications',
    action: 'review',
    description: 'Review and shortlist applications',
  },
  {
    name: 'applications:write',
    resource: 'applications',
    action: 'write',
    description: 'Process applications (legacy)',
  },

  // Interviews
  {
    name: 'interviews:create',
    resource: 'interviews',
    action: 'create',
    description: 'Schedule interviews',
  },
  {
    name: 'interviews:read',
    resource: 'interviews',
    action: 'read',
    description: 'View interview details',
  },
  {
    name: 'interviews:update',
    resource: 'interviews',
    action: 'update',
    description: 'Update interview details',
  },
  {
    name: 'interviews:delete',
    resource: 'interviews',
    action: 'delete',
    description: 'Cancel interviews',
  },

  // Content Moderation
  {
    name: 'moderation:write',
    resource: 'moderation',
    action: 'write',
    description: 'Moderate content',
  },

  // Resume Templates
  {
    name: 'resume-templates:read',
    resource: 'resume-templates',
    action: 'read',
    description: 'View resume templates',
  },
  {
    name: 'resume-templates:write',
    resource: 'resume-templates',
    action: 'write',
    description: 'Create and edit resume templates',
  },
  {
    name: 'resume-templates:delete',
    resource: 'resume-templates',
    action: 'delete',
    description: 'Delete resume templates',
  },

  // Roles
  { name: 'roles:read', resource: 'roles', action: 'read', description: 'View roles' },
  { name: 'roles:write', resource: 'roles', action: 'write', description: 'Create and edit roles' },
  { name: 'roles:delete', resource: 'roles', action: 'delete', description: 'Delete roles' },

  // Settings
  { name: 'settings:read', resource: 'settings', action: 'read', description: 'View settings' },
  { name: 'settings:write', resource: 'settings', action: 'write', description: 'Update settings' },

  // Reports
  { name: 'reports:read', resource: 'reports', action: 'read', description: 'View reports' },

  // Support
  {
    name: 'support:read',
    resource: 'support',
    action: 'read',
    description: 'View support tickets',
  },
  {
    name: 'support:write',
    resource: 'support',
    action: 'write',
    description: 'Handle support tickets',
  },
];

// Define roles and their permissions
const ROLE_PERMISSIONS = {
  SUPER_ADMIN: {
    name: 'SUPER_ADMIN',
    description: 'Super administrator with full access to all features',
    permissions: DEFAULT_PERMISSIONS.map((p) => p.name), // All permissions
  },
  SUPER_EMPLOYER: {
    name: 'SUPER_EMPLOYER',
    description:
      'Company owner with full access to company-scoped features and employer management',
    permissions: [
      'analytics:read',
      'employers:read',
      'employers:write',
      'employers:delete',
      'candidates:read',
      'candidates:write',
      'companies:read',
      'companies:write',
      'jobs:create',
      'jobs:read',
      'jobs:update',
      'jobs:delete',
      'jobs:list',
      'jobs:publish',
      'jobs:unpublish',
      'jobs:moderate',
      'jobs:write',
      'applications:create',
      'applications:read',
      'applications:update',
      'applications:delete',
      'applications:list',
      'applications:review',
      'applications:write',
      'interviews:create',
      'interviews:read',
      'interviews:update',
      'interviews:delete',
      'reports:read',
    ],
  },
  EMPLOYER: {
    name: 'EMPLOYER',
    description: 'Employer role - permissions assigned by super_employer',
    permissions: [
      'jobs:create',
      'jobs:read',
      'jobs:update',
      'jobs:delete',
      'jobs:list',
      'jobs:publish',
      'jobs:unpublish',
      'jobs:moderate',
      'applications:create',
      'applications:read',
      'applications:update',
      'applications:delete',
      'applications:list',
      'applications:review',
      'interviews:create',
      'interviews:read',
      'interviews:update',
      'interviews:delete',
      'candidates:read',
      'companies:read',
      'companies:write',
    ],
  },
};

async function seedRbac() {
  console.log('🌱 Starting RBAC seed...');
  console.log(`📦 Connecting to database: ${DATABASE_URL.split('@')[1]?.split('?')[0]}\n`);

  const db = createDatabaseClient(DATABASE_URL);

  try {
    // ==================== SEED PERMISSIONS ====================
    console.log('📋 Seeding permissions...');
    const createdPermissions = new Map<string, string>(); // name -> id

    for (const perm of DEFAULT_PERMISSIONS) {
      const existing = await db.query.permissions.findFirst({
        where: eq(permissions.name, perm.name),
      });

      if (existing) {
        console.log(`  ✓ Permission "${perm.name}" already exists`);
        createdPermissions.set(perm.name, existing.id);
      } else {
        const [created] = await db
          .insert(permissions)
          .values({
            name: perm.name,
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
            isActive: true,
          })
          .returning();

        createdPermissions.set(perm.name, created.id);
        console.log(`  ✓ Created permission "${perm.name}"`);
      }
    }

    console.log(`\n✅ ${createdPermissions.size} permissions seeded\n`);

    // ==================== SEED ROLES ====================
    console.log('👥 Seeding roles...');

    for (const [_roleKey, roleData] of Object.entries(ROLE_PERMISSIONS)) {
      // Check if role exists
      let role = await db.query.roles.findFirst({
        where: eq(roles.name, roleData.name),
      });

      if (!role) {
        const [created] = await db
          .insert(roles)
          .values({
            name: roleData.name,
            description: roleData.description,
            isActive: true,
          })
          .returning();

        role = created;
        console.log(`  ✓ Created role "${roleData.name}"`);
      } else {
        console.log(`  ✓ Role "${roleData.name}" already exists`);
      }

      // Remove existing permissions for this role
      await db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));

      // Assign permissions to role
      const permissionsToAssign = roleData.permissions
        .map((permName) => createdPermissions.get(permName))
        .filter((id): id is string => id !== undefined);

      if (permissionsToAssign.length > 0) {
        const values = permissionsToAssign.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        }));

        await db.insert(rolePermissions).values(values);
        console.log(`    → Assigned ${permissionsToAssign.length} permissions`);
      }
    }

    console.log('\n✅ Roles seeded successfully\n');

    // ==================== SUMMARY ====================
    console.log('📊 Summary:');
    console.log(`  • Permissions: ${createdPermissions.size}`);
    console.log(`  • Roles: ${Object.keys(ROLE_PERMISSIONS).length}`);
    console.log('');
    console.log('🎉 RBAC seed completed successfully!');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding RBAC:', error);
    process.exit(1);
  }
}

seedRbac();
