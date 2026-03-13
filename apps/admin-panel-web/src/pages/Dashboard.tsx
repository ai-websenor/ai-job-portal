import { Users, UserPlus, FileText, AlertTriangle } from "lucide-react";
import { AnalyticsCard } from "@/components/dashboard/AnalyticsCard";
import { SimpleChart } from "@/components/dashboard/SimpleChart";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your mobile app analytics</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AnalyticsCard
          title="Active Users Today"
          value="1,247"
          description="Currently online"
          icon={<Users className="h-4 w-4" />}
          trend={{ value: 12, isPositive: true }}
        />
        <AnalyticsCard
          title="Active Users This Week"
          value="8,459"
          description="Weekly active users"
          icon={<Users className="h-4 w-4" />}
          trend={{ value: 8, isPositive: true }}
        />
        <AnalyticsCard
          title="Total Posts Created"
          value="23,567"
          description="All time posts"
          icon={<FileText className="h-4 w-4" />}
          trend={{ value: 15, isPositive: true }}
        />
        <AnalyticsCard
          title="Flagged Posts"
          value="42"
          description="Needs review"
          icon={<AlertTriangle className="h-4 w-4" />}
          trend={{ value: -5, isPositive: false }}
        />
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SimpleChart />
        
        {/* Additional Stats Card */}
        <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-foreground">Quick Stats</h3>
            <p className="text-sm text-muted-foreground">Key metrics at a glance</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-admin-border-subtle">
              <span className="text-sm text-muted-foreground">Average Session Duration</span>
              <span className="font-medium text-foreground">4m 32s</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-admin-border-subtle">
              <span className="text-sm text-muted-foreground">Retention Rate (7 days)</span>
              <span className="font-medium text-success">68.4%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-admin-border-subtle">
              <span className="text-sm text-muted-foreground">Posts per User</span>
              <span className="font-medium text-foreground">2.8</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">App Store Rating</span>
              <span className="font-medium text-foreground">4.7 ⭐</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}