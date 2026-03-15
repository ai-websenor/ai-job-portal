import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangeFilter } from '@/components/reports/DateRangeFilter';
import { OverviewTab } from '@/components/reports/OverviewTab';
import { JobsTab } from '@/components/reports/JobsTab';
import { ApplicationsTab } from '@/components/reports/ApplicationsTab';
import { CandidatesTab } from '@/components/reports/CandidatesTab';
import { EmployersTab } from '@/components/reports/EmployersTab';
import { HiringFunnelTab } from '@/components/reports/HiringFunnelTab';
import { InterviewsTab } from '@/components/reports/InterviewsTab';
import { RevenueTab } from '@/components/reports/RevenueTab';

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

export default function ReportsPage() {
  const [startDate, setStartDate] = useState(daysAgo(30));
  const [endDate, setEndDate] = useState(today());
  const [groupBy, setGroupBy] = useState('day');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Platform analytics and insights</p>
      </div>

      <DateRangeFilter
        startDate={startDate}
        endDate={endDate}
        groupBy={groupBy}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onGroupByChange={setGroupBy}
      />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-admin-surface border border-admin-border-subtle p-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="candidates">Candidates</TabsTrigger>
          <TabsTrigger value="employers">Employers</TabsTrigger>
          <TabsTrigger value="hiring-funnel">Hiring Funnel</TabsTrigger>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab />
        </TabsContent>

        <TabsContent value="jobs">
          <JobsTab startDate={startDate} endDate={endDate} groupBy={groupBy} />
        </TabsContent>

        <TabsContent value="applications">
          <ApplicationsTab startDate={startDate} endDate={endDate} groupBy={groupBy} />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidatesTab />
        </TabsContent>

        <TabsContent value="employers">
          <EmployersTab startDate={startDate} endDate={endDate} groupBy={groupBy} />
        </TabsContent>

        <TabsContent value="hiring-funnel">
          <HiringFunnelTab startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="interviews">
          <InterviewsTab startDate={startDate} endDate={endDate} />
        </TabsContent>

        <TabsContent value="revenue">
          <RevenueTab startDate={startDate} endDate={endDate} groupBy={groupBy} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
