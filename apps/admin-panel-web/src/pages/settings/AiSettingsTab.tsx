/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, CheckCircle2, Globe, Info, Table2, TriangleAlert } from 'lucide-react';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

// ─── Types ─────────────────────────────────────────────────────────

interface AiSettingsOverview {
  salaryExternalSource: {
    enabled: boolean;
    provider: string | null;
    providerAvailable: boolean;
    active: boolean;
    availableProviders: { id: string; label: string }[];
    updatedAt: string | null;
  };
  platformData: {
    pricedActiveJobs: number;
    benchmarkRows: number;
    canPriceFromPlatformData: boolean;
  };
}

/** Selected in the dropdown when no external source is chosen. */
const NO_PROVIDER = '__none__';

// ─── Component ─────────────────────────────────────────────────────

/**
 * AI Settings: where salary figures are allowed to come from.
 *
 * Salary prediction prices a job against the adverts already on this platform.
 * That works well once the board has traffic and not at all on day one, when
 * every estimate honestly comes back as "not enough data". This tab controls the
 * optional fallback for that cold start.
 *
 * The screen is deliberately explicit about the order of sources and about what
 * the switch does *not* do. An admin turning this on is agreeing to send draft
 * job details to a third party, so the consequence should be on the page rather
 * than in a document nobody opens.
 */
export default function AiSettingsTab() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: async () => {
      const response = await http.get(endpoints.aiSettings.overview);
      return (response as unknown as { data: AiSettingsOverview }).data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (body: { enabled?: boolean; provider?: string }) => {
      return await http.patch(endpoints.aiSettings.salaryExternalSource, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      toast.success('AI settings updated');
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || error?.message || 'Failed to update AI settings',
      );
    },
  });

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const { salaryExternalSource: source, platformData } = data;
  const hasProviders = source.availableProviders.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Where salary figures come from ── */}
      <Card>
        <CardHeader>
          <CardTitle>Salary prediction data sources</CardTitle>
          <CardDescription>
            Salary estimates are always built from this platform&apos;s own data first. The order
            below is fixed and cannot be changed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SourceRow
            step={1}
            icon={<Building2 className="h-4 w-4" />}
            title="Live job adverts on this platform"
            detail="Jobs with a salary that are currently active. Always tried first."
            stat={`${platformData.pricedActiveJobs} priced active job${
              platformData.pricedActiveJobs === 1 ? '' : 's'
            }`}
            healthy={platformData.pricedActiveJobs >= 8}
          />
          <SourceRow
            step={2}
            icon={<Table2 className="h-4 w-4" />}
            title="Curated benchmark table"
            detail="Reference pay bands an admin has imported. Used when too few adverts match the role."
            stat={`${platformData.benchmarkRows} benchmark row${
              platformData.benchmarkRows === 1 ? '' : 's'
            }`}
            healthy={platformData.benchmarkRows > 0}
          />
          <SourceRow
            step={3}
            icon={<Globe className="h-4 w-4" />}
            title="External salary source"
            detail="An outside service. Only consulted when steps 1 and 2 both come back empty."
            stat={source.active ? 'In use' : 'Not in use'}
            healthy={source.active}
            muted={!source.active}
          />

          <Separator />

          {platformData.canPriceFromPlatformData ? (
            <p className="text-sm text-muted-foreground flex gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
              There is enough platform data to price jobs, so step 3 will rarely be reached. Turning
              it on changes little today.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground flex gap-2">
              <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              There is not enough platform data to price jobs yet, so employers will be told
              &ldquo;not enough data&rdquo; until either more priced jobs are posted, benchmark rows
              are imported, or an external source is switched on below.
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── The switch ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            External salary source
            {source.active ? (
              <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
            ) : (
              <Badge variant="secondary">Off</Badge>
            )}
          </CardTitle>
          <CardDescription>
            A fallback for roles this platform cannot price from its own adverts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-start justify-between gap-6 rounded-lg border p-4">
            <div className="space-y-1">
              <Label htmlFor="external-source-enabled" className="text-base">
                Allow the external fallback
              </Label>
              <p className="text-sm text-muted-foreground">
                When on, a job that no platform data can price is sent to the selected source for an
                estimate. Its job title, skills, experience and city leave the platform; no employer
                or candidate names are included.
              </p>
            </div>
            <Switch
              id="external-source-enabled"
              checked={source.enabled}
              disabled={mutation.isPending}
              onCheckedChange={(enabled) => mutation.mutate({ enabled })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="external-source-provider">Source</Label>
            <Select
              value={source.provider ?? NO_PROVIDER}
              disabled={!hasProviders || mutation.isPending}
              onValueChange={(value) =>
                mutation.mutate({ provider: value === NO_PROVIDER ? '' : value })
              }
            >
              <SelectTrigger id="external-source-provider" className="max-w-sm">
                <SelectValue
                  placeholder={hasProviders ? 'Select a source' : 'No source available'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PROVIDER}>None</SelectItem>
                {source.availableProviders.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    {provider.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {!hasProviders && (
              <p className="text-sm text-muted-foreground flex gap-2">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                No external source has been connected yet, so the switch above has no effect. The
                groundwork is in place; connecting a provider is a development task, not a setting.
              </p>
            )}

            {hasProviders && source.enabled && !source.providerAvailable && (
              <p className="text-sm text-amber-600 flex gap-2">
                <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                The fallback is switched on but no source is selected, so nothing will happen.
              </p>
            )}
          </div>

          <Separator />

          {/* What an estimate from outside looks like to an employer. This is
              here because the limits are the reason the fallback is acceptable
              at all, and an admin should not have to take that on trust. */}
          <div className="space-y-2">
            <p className="text-sm font-medium">When an estimate comes from outside</p>
            <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-5">
              <li>It is always labelled low confidence.</li>
              <li>The employer is told on screen that it came from outside the platform.</li>
              <li>
                It never produces the &ldquo;your range is below similar roles&rdquo; warning — that
                line claims a comparison with real adverts, which this is not.
              </li>
              <li>
                If the source is slow, down or returns something unusable, the employer simply sees
                &ldquo;not enough data&rdquo; rather than an error.
              </li>
            </ul>
          </div>

          {source.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Last changed {new Date(source.updatedAt).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Pieces ────────────────────────────────────────────────────────

function SourceRow({
  step,
  icon,
  title,
  detail,
  stat,
  healthy,
  muted,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  detail: string;
  stat: string;
  healthy: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 ${muted ? 'opacity-70' : ''}`}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
        {step}
      </div>
      <div className="flex-1 space-y-0.5">
        <p className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
        </p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
      <Badge variant={healthy ? 'default' : 'secondary'} className="shrink-0 whitespace-nowrap">
        {stat}
      </Badge>
    </div>
  );
}
