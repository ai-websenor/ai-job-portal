interface Employer {
  company_name: string;
  employer_id: string;
  job_count: number;
  application_count: number;
}

interface TopEmployersTableProps {
  data: Employer[];
}

export function TopEmployersTable({ data }: TopEmployersTableProps) {
  return (
    <div className="bg-admin-surface rounded-lg border border-admin-border-subtle shadow-admin-card p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Top Employers</h3>
        <p className="text-sm text-muted-foreground">By job postings</p>
      </div>
      <div className="overflow-x-auto">
        {data.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-admin-border-subtle">
                <th className="text-left py-2 text-muted-foreground font-medium">#</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Company</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Jobs</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Applications</th>
              </tr>
            </thead>
            <tbody>
              {data.map((employer, index) => (
                <tr
                  key={employer.employer_id}
                  className="border-b border-admin-border-subtle last:border-0"
                >
                  <td className="py-2.5 text-muted-foreground">{index + 1}</td>
                  <td className="py-2.5 font-medium text-foreground">{employer.company_name}</td>
                  <td className="py-2.5 text-right text-foreground">
                    {Number(employer.job_count)}
                  </td>
                  <td className="py-2.5 text-right text-foreground">
                    {Number(employer.application_count)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No employer data available
          </div>
        )}
      </div>
    </div>
  );
}
