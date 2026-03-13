# Quick Reference: Jobboard Admin Architecture

## 📁 Directory Structure

```
src/
├── api/
│   ├── http.ts          # Axios instance with interceptors
│   └── endpoints.ts     # API endpoint definitions
├── components/
│   ├── forms/           # FormInput, FormTextarea, FormSelect, FormCheckbox
│   ├── table/           # DataTable, ActionButtons
│   ├── lib/             # PageHeader, LoadingSpinner, EmptyState, ConfirmDialog
│   ├── ui/              # shadcn/ui components
│   └── dashboard/       # Dashboard-specific components
├── hooks/
│   └── useApi.ts        # Generic API request hook
├── layout/
│   ├── AuthLayout.tsx   # Layout for auth pages
│   └── AppLayout.tsx    # Layout for app pages
├── lib/
│   ├── config.ts        # App configuration
│   └── onLogout.ts      # Logout utility
├── pages/
│   ├── auth/            # LoginPage
│   ├── dashboard/       # DashboardPage
│   ├── users/           # UsersListPage
│   ├── roles/           # RolesListPage, RolesFormPage
│   ├── members/         # MembersListPage
│   └── moderation/      # ModerationListPage
├── routes/
│   ├── routePath.ts     # Route path constants
│   └── routes.tsx       # Route definitions
├── stores/
│   ├── authStore.ts     # Auth state (with persist)
│   ├── roleStore.ts     # Role state (with persist)
│   └── moderationStore.ts # Moderation state (with persist)
├── types/
│   └── index.d.ts       # TypeScript interfaces
└── App.tsx              # Main app component
```

## 🔑 Key Patterns

### Route Paths
```typescript
import routePath from "@/routes/routePath";

// Navigation
navigate(routePath.USER.LIST);
navigate(routePath.ROLE.EDIT.replace(':id', roleId));

// Links
<Link to={routePath.DASHBOARD}>Dashboard</Link>
```

### API Calls
```typescript
import http from "@/api/http";
import endpoints from "@/api/endpoints";

// GET
const users = await http.get(endpoints.user.list);

// POST
const newUser = await http.post(endpoints.user.create, data);

// PUT
await http.put(endpoints.user.update(id), data);

// DELETE
await http.delete(endpoints.user.delete(id));
```

### Forms
```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form } from "@/components/ui/form";
import { FormInput } from "@/components/forms/FormInput";

const schema = z.object({
  name: z.string().min(2),
});

const form = useForm({
  resolver: zodResolver(schema),
});

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormInput
      control={form.control}
      name="name"
      label="Name"
      placeholder="Enter name"
    />
  </form>
</Form>
```

### Tables
```typescript
import { DataTable, DataTableColumn } from "@/components/table/DataTable";
import { ActionButtons } from "@/components/table/ActionButtons";

const columns: DataTableColumn<User>[] = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  {
    key: "actions",
    label: "Actions",
    render: (_, row) => (
      <ActionButtons
        onEdit={() => navigate(routePath.USER.EDIT.replace(':id', row.id))}
        onDelete={() => handleDelete(row.id)}
      />
    ),
  },
];

<DataTable
  columns={columns}
  data={users}
  keyExtractor={(user) => user.id}
  emptyMessage="No users found"
/>
```

### Page Header
```typescript
import { PageHeader } from "@/components/lib/PageHeader";
import { Plus } from "lucide-react";

<PageHeader
  title="Users"
  description="Manage user accounts"
  action={{
    label: "Add User",
    onClick: () => navigate(routePath.USER.CREATE),
    icon: <Plus className="mr-2 h-4 w-4" />,
  }}
/>
```

### Store Usage
```typescript
import { useAuthStore } from "@/stores/authStore";

// In component
const { user, isAuthenticated, login, logout } = useAuthStore();

// Call actions
await login(email, password);
logout();

// Access state
if (isAuthenticated) {
  console.log(user.name);
}
```

### Loading State
```typescript
import { LoadingSpinner } from "@/components/lib/LoadingSpinner";

{loading ? (
  <LoadingSpinner size={40} text="Loading..." />
) : (
  <DataTable ... />
)}
```

### Empty State
```typescript
import { EmptyState } from "@/components/lib/EmptyState";
import { Users } from "lucide-react";

<EmptyState
  icon={<Users className="h-12 w-12" />}
  title="No users found"
  description="Get started by adding your first user"
  action={{
    label: "Add User",
    onClick: () => navigate(routePath.USER.CREATE),
  }}
/>
```

### Confirm Dialog
```typescript
import { ConfirmDialog } from "@/components/lib/ConfirmDialog";

const [confirmOpen, setConfirmOpen] = useState(false);

<ConfirmDialog
  open={confirmOpen}
  onOpenChange={setConfirmOpen}
  title="Delete User"
  description="Are you sure you want to delete this user? This action cannot be undone."
  confirmLabel="Delete"
  variant="destructive"
  onConfirm={() => handleDelete(userId)}
/>
```

## 🚀 Common Tasks

### Add a New Feature

1. **Define routes** in `src/routes/routePath.ts`:
```typescript
FEATURE: {
  LIST: "/feature/list",
  CREATE: "/feature/create",
  EDIT: "/feature/edit/:id",
}
```

2. **Add endpoints** in `src/api/endpoints.ts`:
```typescript
feature: {
  list: "/admin/feature/list",
  create: "/admin/feature",
  details: (id: string) => `/admin/feature/${id}`,
  update: (id: string) => `/admin/feature/${id}`,
  delete: (id: string) => `/admin/feature/${id}`,
}
```

3. **Create pages**:
```bash
mkdir src/pages/feature
# Create: FeatureListPage.tsx, FeatureFormPage.tsx
```

4. **Register routes** in `src/routes/routes.tsx`:
```typescript
const FeatureListPage = lazy(() => import("@/pages/feature/FeatureListPage"));

const allRoutes = [
  // ...
  { path: routePath.FEATURE.LIST, element: <FeatureListPage /> },
  { path: routePath.FEATURE.CREATE, element: <FeatureFormPage /> },
  { path: routePath.FEATURE.EDIT, element: <FeatureFormPage /> },
];
```

5. **Add to sidebar** in `src/components/AdminSidebar.tsx`:
```typescript
{ title: "Feature", url: routePath.FEATURE.LIST, icon: Icon }
```

### Update Environment Variables

```bash
# Edit .env.development or .env.production
VITE_API_BASE_URL=http://your-api-url/api/
VITE_APP_NAME=Your App Name

# Access in code
import config from "@/lib/config";
console.log(config.API_BASE_URL);
```

### Add TypeScript Types

Edit `src/types/index.d.ts`:
```typescript
export interface IYourType {
  id: string;
  name: string;
  // ...
}
```

## 🛠️ Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## 🔒 Authentication Flow

1. User visits protected route → Redirected to `/login`
2. User submits login form → `authStore.login()` called
3. Store saves user + token → Persisted to localStorage
4. User redirected to dashboard
5. All API requests include Bearer token (via interceptor)
6. On 401 response → Auto logout + redirect to `/login`

## 📦 Import Aliases

Use `@/` prefix for all imports:

```typescript
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/authStore";
import http from "@/api/http";
import routePath from "@/routes/routePath";
import { IUser } from "@/types/index.d.ts";
```

## 🎨 UI Components

All from shadcn/ui - see `src/components/ui/`:
- Button, Input, Textarea, Select
- Card, Dialog, AlertDialog
- Table, Form, Checkbox
- Badge, Separator, Tabs
- Sidebar, SidebarProvider
- And more...

## 📝 Notes

- **Mock data** still active in stores - replace with API calls when backend ready
- **Token management** handled by axios interceptor in `src/api/http.ts`
- **Route protection** handled automatically by `ProtectedRoute` wrapper
- **Error handling** via axios interceptor → shows Sonner toast
- **State persistence** via Zustand persist middleware → localStorage

## 🔗 Quick Links

- [CLAUDE.md](/var/www/html/jobboard/jobboard-admin/CLAUDE.md) - Full project guidelines
- [MIGRATION_COMPLETE.md](/var/www/html/jobboard/jobboard-admin/MIGRATION_COMPLETE.md) - Detailed migration docs
- [Admin Reference](/var/www/html/jobboard/admin) - Reference architecture project

---

**Dev Server:** http://localhost:8081/
**API Base URL:** http://localhost:3001/api/ (configurable in .env)
