/* eslint-disable @typescript-eslint/no-unused-vars */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Lock,
  LockKeyhole,
  ShieldCheck,
  ShieldAlert,
  Fingerprint,
  RefreshCw,
  Clock,
  CreditCard,
  Mail,
  MessageSquare,
  Globe,
  Video,
  Bell,
  CheckCircle2,
  ScrollText,
  Copy,
  Check,
  Smartphone,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { LoadingSpinner } from '@/components/lib/LoadingSpinner';
import { useVaultStore } from '@/stores/vaultStore';
import { secretManagerApi, SecretGroups, SecretView, VaultStatus } from '@/api/secretManager';

type LucideIcon = typeof KeyRound;

const CATEGORY_META: Record<string, { label: string; icon: LucideIcon; blurb: string }> = {
  payments: { label: 'Payments', icon: CreditCard, blurb: 'Stripe & Razorpay' },
  email: { label: 'Email', icon: Mail, blurb: 'Sender identity' },
  sms: { label: 'SMS', icon: MessageSquare, blurb: 'Twilio messaging' },
  oauth: { label: 'Social Login', icon: Globe, blurb: 'Google & LinkedIn OAuth' },
  video: { label: 'Video Conferencing', icon: Video, blurb: 'Zoom & Teams' },
  push: { label: 'Push Notifications', icon: Bell, blurb: 'Firebase messaging' },
};

const REVEAL_TTL = 2;

function fmtCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------

export default function SecretManagerPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const isUnlocked = useVaultStore((s) => s.isUnlocked());
  const expiresAt = useVaultStore((s) => s.expiresAt);
  const clearVault = useVaultStore((s) => s.clear);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      setStatus(await secretManagerApi.status());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Hard 20-minute client auto-lock (server enforces independently).
  useEffect(() => {
    if (!expiresAt) return;
    const id = setInterval(() => {
      if (Date.now() >= (expiresAt ?? 0)) {
        clearVault();
        toast.info('Vault locked after 20 minutes. Unlock again to continue.');
      }
    }, 1000);
    return () => clearInterval(id);
  }, [expiresAt, clearVault]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 animate-in fade-in-50 slide-in-from-top-2 duration-500">
        <ShieldCheck className="pointer-events-none absolute -right-8 -top-8 h-44 w-44 text-primary/10" />
        <div className="relative flex items-start gap-4">
          <div className="relative shrink-0">
            <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/30" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
              <LockKeyhole className="h-6 w-6" />
            </span>
          </div>
          <div className="space-y-1">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
              Secret Manager
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-600">
                <ShieldCheck className="h-3 w-3" /> Encrypted vault
              </span>
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground">
              Your integration credentials — encrypted at rest, revealed only after step-up
              verification.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <FeaturePill icon={Lock} label="AES-256-GCM" />
              <FeaturePill icon={Fingerprint} label="2FA unlock" />
              <FeaturePill icon={Clock} label="20-min session" />
              <FeaturePill icon={ScrollText} label="Audited" />
            </div>
          </div>
        </div>
      </div>

      <Alert className="border-amber-500/30 bg-amber-500/5">
        <ShieldAlert className="h-4 w-4 text-amber-600" />
        <AlertTitle>Only your own service credentials live here</AlertTitle>
        <AlertDescription>
          Infrastructure secrets (database, JWT, AWS keys) are managed by your deployment, not here.
        </AlertDescription>
      </Alert>

      {loading ? (
        <div className="py-16 flex justify-center">
          <LoadingSpinner size={36} text="Loading vault..." />
        </div>
      ) : !status?.configured ? (
        <SetupCard onDone={loadStatus} />
      ) : !status.totpEnabled ? (
        <ConfirmTotpCard onDone={loadStatus} />
      ) : status.locked ? (
        <LockedCard lockedUntil={status.lockedUntil} onRecovered={loadStatus} />
      ) : !isUnlocked ? (
        <UnlockCard onUnlocked={loadStatus} onRecovered={loadStatus} />
      ) : (
        <SecretsPanel />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function SetupCard({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<'form' | 'totp'>('form');
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryMobile, setRecoveryMobile] = useState('');
  const [enroll, setEnroll] = useState<{ otpauthUrl: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);

  const mismatch = confirm.length > 0 && passphrase !== confirm;

  const submit = async () => {
    if (passphrase !== confirm) {
      toast.error('Passphrases do not match');
      return;
    }
    setBusy(true);
    try {
      const res = await secretManagerApi.setup({ passphrase, recoveryEmail, recoveryMobile });
      setEnroll(res);
      setStep('totp');
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  const confirmTotp = async () => {
    setBusy(true);
    try {
      await secretManagerApi.confirmTotp(code);
      toast.success('Vault enabled');
      onDone();
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <LockKeyhole className="h-4 w-4 text-primary" />
          </span>
          Set up your vault
        </CardTitle>
        <CardDescription>
          Create a strong passphrase and enroll an authenticator app. You'll need both every time
          you open the Secret Manager.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {step === 'form' ? (
          <>
            <Field label="Vault passphrase">
              <PassphraseInput
                value={passphrase}
                onChange={setPassphrase}
                placeholder="Min 12 chars, upper, lower, number, symbol"
                showStrength
              />
            </Field>
            <Field label="Confirm passphrase">
              <PassphraseInput value={confirm} onChange={setConfirm} />
              {mismatch && <p className="text-xs text-destructive">Passphrases do not match</p>}
            </Field>
            <Field label="Recovery email">
              <IconInput
                icon={Mail}
                type="email"
                value={recoveryEmail}
                onChange={setRecoveryEmail}
                placeholder="owner@company.com"
              />
            </Field>
            <Field label="Recovery mobile">
              <IconInput
                icon={Smartphone}
                value={recoveryMobile}
                onChange={setRecoveryMobile}
                placeholder="+919876543210"
              />
            </Field>
            <Button
              className="w-full"
              onClick={submit}
              disabled={busy || !passphrase || mismatch || !recoveryEmail || !recoveryMobile}
            >
              Continue
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Smartphone className="h-4 w-4 text-primary" /> Add to your authenticator app
              </div>
              <p className="text-xs text-muted-foreground">
                Enter this key in Google Authenticator / Authy / 1Password:
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-background px-2 py-1.5 text-sm font-mono tracking-wider">
                  {enroll?.secret}
                </code>
                <CopyButton text={enroll?.secret ?? ''} />
              </div>
              <p className="break-all text-[11px] text-muted-foreground">{enroll?.otpauthUrl}</p>
            </div>
            <Field label="Enter the 6-digit code to confirm">
              <OtpBoxes value={code} onChange={setCode} />
            </Field>
            <Button className="w-full" onClick={confirmTotp} disabled={busy || code.length !== 6}>
              <ShieldCheck className="mr-1.5 h-4 w-4" /> Enable vault
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ConfirmTotpCard({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const confirm = async () => {
    setBusy(true);
    try {
      await secretManagerApi.confirmTotp(code);
      toast.success('Vault enabled');
      onDone();
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" /> Finish setup
        </CardTitle>
        <CardDescription>
          Enter the current code from the authenticator app you enrolled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Authenticator code">
          <OtpBoxes value={code} onChange={setCode} />
        </Field>
        <Button className="w-full" onClick={confirm} disabled={busy || code.length !== 6}>
          <ShieldCheck className="mr-1.5 h-4 w-4" /> Enable vault
        </Button>
      </CardContent>
    </Card>
  );
}

function UnlockCard({
  onUnlocked,
  onRecovered,
}: {
  onUnlocked: () => void;
  onRecovered: () => void;
}) {
  const [passphrase, setPassphrase] = useState('');
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const setSession = useVaultStore((s) => s.setSession);

  const unlock = async () => {
    setBusy(true);
    try {
      const res = await secretManagerApi.unlock({ passphrase, totp });
      setSession(res.vaultToken, res.expiresIn);
      toast.success('Vault unlocked');
      onUnlocked();
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="overflow-hidden animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
      <CardHeader className="items-center text-center">
        <div className="relative mb-2">
          <span className="absolute inset-0 animate-ping rounded-2xl bg-primary/20" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Lock className="h-7 w-7 text-primary" />
          </span>
        </div>
        <CardTitle>Vault locked</CardTitle>
        <CardDescription>
          Enter your passphrase and authenticator code to unlock for 20 minutes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Field label="Passphrase">
          <PassphraseInput value={passphrase} onChange={setPassphrase} autoComplete="off" />
        </Field>
        <Field label="Authenticator code">
          <OtpBoxes value={totp} onChange={setTotp} />
        </Field>
        <Button
          className="w-full"
          onClick={unlock}
          disabled={busy || !passphrase || totp.length !== 6}
        >
          <LockKeyhole className="mr-1.5 h-4 w-4" /> Unlock vault
        </Button>
        <div className="flex justify-center">
          <RecoveryDialog onRecovered={onRecovered} />
        </div>
      </CardContent>
    </Card>
  );
}

function LockedCard({
  lockedUntil,
  onRecovered,
}: {
  lockedUntil: string | null;
  onRecovered: () => void;
}) {
  const until = lockedUntil ? new Date(lockedUntil) : null;
  return (
    <Card className="border-destructive/30 animate-in fade-in-50 slide-in-from-bottom-3 duration-500">
      <CardHeader className="items-center text-center">
        <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <ShieldAlert className="h-7 w-7 text-destructive" />
        </div>
        <CardTitle className="text-destructive">Temporarily locked</CardTitle>
        <CardDescription>
          Too many failed attempts.{' '}
          {until ? `Try again after ${until.toLocaleTimeString()}.` : 'Try again later.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center">
        <RecoveryDialog onRecovered={onRecovered} />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------

function SecretsPanel() {
  const [groups, setGroups] = useState<SecretGroups>({});
  const [loading, setLoading] = useState(true);
  const expiresAt = useVaultStore((s) => s.expiresAt);
  const clearVault = useVaultStore((s) => s.clear);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const remaining = expiresAt ? Math.max(0, Math.round((expiresAt - Date.now()) / 1000)) : 0;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setGroups(await secretManagerApi.listSecrets());
    } catch {
      /* toasted globally */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lock = async () => {
    try {
      await secretManagerApi.lock();
    } catch {
      /* ignore */
    }
    clearVault();
  };

  const categories = useMemo(() => Object.keys(groups), [groups]);

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-card animate-in fade-in-50 duration-500">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span className="font-medium text-emerald-700">Vault unlocked</span>
            <span className="flex items-center gap-1 text-muted-foreground">
              · <Clock className="h-3.5 w-3.5" /> <strong>{fmtCountdown(remaining)}</strong> left
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ChangePassphraseDialog />
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="secondary" size="sm" onClick={lock}>
              <Lock className="mr-1 h-3.5 w-3.5" /> Lock
            </Button>
          </div>
        </div>
        {/* Draining session bar */}
        <div className="h-1 w-full bg-muted">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-primary transition-all duration-1000 ease-linear"
            style={{ width: `${Math.max(0, Math.min(100, (remaining / (20 * 60)) * 100))}%` }}
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner size={32} text="Loading secrets..." />
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={categories} className="space-y-2">
          {categories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const Icon = meta?.icon ?? KeyRound;
            const setCount = groups[cat].filter((s) => s.isSet).length;
            return (
              <AccordionItem
                key={cat}
                value={cat}
                className="rounded-xl border px-4 transition-colors hover:border-primary/40"
              >
                <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <span className="flex flex-1 items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </span>
                    <span>{meta?.label ?? cat}</span>
                    {meta?.blurb && (
                      <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
                        — {meta.blurb}
                      </span>
                    )}
                    <Badge variant="outline" className="ml-auto mr-2 text-xs font-normal">
                      {setCount}/{groups[cat].length} set
                    </Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pt-2">
                  {groups[cat].map((s) => (
                    <SecretRow key={s.key} secret={s} onChanged={load} />
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function SecretRow({ secret, onChanged }: { secret: SecretView; onChanged: () => void }) {
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [revealOpen, setRevealOpen] = useState(false);

  const save = async () => {
    if (!value) return;
    setBusy(true);
    try {
      await secretManagerApi.updateSecret(secret.key, value);
      toast.success(`${secret.label} saved`);
      setValue('');
      onChanged();
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await secretManagerApi.testSecret(secret.key);
      toast[res.validationStatus === 'valid' ? 'success' : 'error'](
        `${secret.label}: ${res.validationStatus}`,
      );
      onChanged();
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-card/40 p-3 transition-colors hover:bg-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {secret.isSecret ? (
            <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-primary" />
          ) : (
            <KeyRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          )}
          <Label className="truncate font-medium">{secret.label}</Label>
          <code className="hidden truncate text-xs text-muted-foreground sm:inline">
            {secret.key}
          </code>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {secret.isSet ? (
            <Badge variant="secondary" className="gap-1 font-mono">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> {secret.masked}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">
              Not set
            </Badge>
          )}
          {secret.validationStatus === 'valid' && (
            <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> valid
            </Badge>
          )}
          {secret.validationStatus === 'invalid' && (
            <Badge variant="destructive" className="gap-1">
              <ShieldAlert className="h-3 w-3" /> invalid
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="password"
          autoComplete="off"
          spellCheck={false}
          className="flex-1 font-mono"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={secret.isSet ? 'Enter a new value to replace' : 'Enter value'}
        />
        <Button size="sm" onClick={save} disabled={busy || !value}>
          Save
        </Button>
        {secret.isSet && (
          <>
            <Button size="sm" variant="outline" onClick={() => setRevealOpen(true)} disabled={busy}>
              Reveal
            </Button>
            <Button size="sm" variant="ghost" onClick={test} disabled={busy}>
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Test
            </Button>
          </>
        )}
      </div>

      <RevealDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        secretKey={secret.key}
        label={secret.label}
      />
    </div>
  );
}

function RevealDialog({
  open,
  onOpenChange,
  secretKey,
  label,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  secretKey: string;
  label: string;
}) {
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(REVEAL_TTL);

  useEffect(() => {
    if (!open) {
      setTotp('');
      setValue(null);
    }
  }, [open]);

  // Auto-hide a revealed value after REVEAL_TTL seconds, with a live countdown.
  useEffect(() => {
    if (value === null) return;
    setSecondsLeft(REVEAL_TTL);
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          setValue(null);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [value]);

  const reveal = async () => {
    setBusy(true);
    try {
      const res = await secretManagerApi.revealSecret(secretKey, totp);
      setValue(res.value);
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LockKeyhole className="h-5 w-5 text-primary" /> Reveal {label}
          </DialogTitle>
          <DialogDescription>
            Confirm with a fresh authenticator code. The value auto-hides after {REVEAL_TTL}{' '}
            seconds.
          </DialogDescription>
        </DialogHeader>
        {value === null ? (
          <Field label="Authenticator code">
            <OtpBoxes value={totp} onChange={setTotp} />
          </Field>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 p-2">
              <code className="flex-1 break-all px-1 text-sm font-mono">{value}</code>
              <CopyButton text={value} />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-1000 ease-linear"
                  style={{ width: `${(secondsLeft / REVEAL_TTL) * 100}%` }}
                />
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> hides in {secondsLeft}s
              </p>
            </div>
          </div>
        )}
        <DialogFooter>
          {value === null ? (
            <Button onClick={reveal} disabled={busy || totp.length !== 6}>
              Reveal
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePassphraseDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [totp, setTotp] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await secretManagerApi.changePassphrase({
        currentPassphrase: current,
        newPassphrase: next,
        totp,
      });
      toast.success('Passphrase changed');
      setOpen(false);
      setCurrent('');
      setNext('');
      setTotp('');
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <KeyRound className="mr-1 h-3.5 w-3.5" /> Change passphrase
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Change vault passphrase
            </DialogTitle>
            <DialogDescription>
              Requires your current passphrase and an authenticator code.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Current passphrase">
              <PassphraseInput value={current} onChange={setCurrent} autoComplete="off" />
            </Field>
            <Field label="New passphrase">
              <PassphraseInput
                value={next}
                onChange={setNext}
                placeholder="Min 12 chars, upper, lower, number, symbol"
                showStrength
              />
            </Field>
            <Field label="Authenticator code">
              <OtpBoxes value={totp} onChange={setTotp} />
            </Field>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={busy || !current || !next || totp.length !== 6}>
              Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RecoveryDialog({ onRecovered }: { onRecovered: () => void }) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<{
    email: string;
    mobile: string;
    devEmailOtp?: string;
    devMobileOtp?: string;
  } | null>(null);
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [newPassphrase, setNewPassphrase] = useState('');
  const [busy, setBusy] = useState(false);

  const request = async () => {
    setBusy(true);
    try {
      const res = await secretManagerApi.requestRecovery();
      setSent(res);
      // Dev convenience: prefill when the API returns the codes (non-production only).
      if (res.devEmailOtp) setEmailOtp(res.devEmailOtp);
      if (res.devMobileOtp) setMobileOtp(res.devMobileOtp);
      toast.success('Verification codes sent');
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    setBusy(true);
    try {
      await secretManagerApi.confirmRecovery({ emailOtp, mobileOtp, newPassphrase });
      toast.success('Passphrase reset. Please unlock with your new passphrase.');
      setOpen(false);
      setSent(null);
      setEmailOtp('');
      setMobileOtp('');
      setNewPassphrase('');
      onRecovered();
    } catch {
      /* toasted globally */
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="link" size="sm" onClick={() => setOpen(true)}>
        Forgot passphrase?
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-600" /> Reset vault passphrase
            </DialogTitle>
            <DialogDescription>
              We'll send a one-time code to BOTH your recovery email and mobile. You need both to
              reset.
            </DialogDescription>
          </DialogHeader>
          {!sent ? (
            <Button className="w-full" onClick={request} disabled={busy}>
              <Mail className="mr-1.5 h-4 w-4" /> Send codes
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2 text-sm">
                <span className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" /> {sent.email}
                </span>
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3.5 w-3.5 text-muted-foreground" /> {sent.mobile}
                </span>
              </div>
              {sent.devEmailOtp && (
                <p className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-600">
                  Dev mode: codes prefilled (email {sent.devEmailOtp}, mobile {sent.devMobileOtp}).
                </p>
              )}
              <Field label="Email code">
                <OtpBoxes value={emailOtp} onChange={setEmailOtp} />
              </Field>
              <Field label="Mobile code">
                <OtpBoxes value={mobileOtp} onChange={setMobileOtp} />
              </Field>
              <Field label="New passphrase">
                <PassphraseInput
                  value={newPassphrase}
                  onChange={setNewPassphrase}
                  placeholder="Min 12 chars, upper, lower, number, symbol"
                  showStrength
                />
              </Field>
              <Button
                className="w-full"
                onClick={confirm}
                disabled={busy || emailOtp.length !== 6 || mobileOtp.length !== 6 || !newPassphrase}
              >
                Reset passphrase
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Reusable form pieces

function OtpBoxes({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <InputOTP maxLength={6} value={value} onChange={(v) => onChange(v.replace(/\D/g, ''))}>
      <InputOTPGroup>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <InputOTPSlot key={i} index={i} className="h-11 w-11 text-base font-semibold" />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

function PassphraseInput({
  value,
  onChange,
  placeholder,
  autoComplete = 'new-password',
  showStrength = false,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showStrength?: boolean;
}) {
  return (
    <div className="space-y-2">
      <div className="relative">
        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="password"
          autoComplete={autoComplete}
          spellCheck={false}
          className="pl-9"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {showStrength && value.length > 0 && <StrengthMeter value={value} />}
    </div>
  );
}

function passphraseScore(v: string): number {
  let s = 0;
  if (v.length >= 12) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s; // 0..4
}

function StrengthMeter({ value }: { value: string }) {
  const score = passphraseScore(value);
  const labels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const color = [
    'bg-destructive',
    'bg-destructive',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-emerald-500',
  ][score];
  const textColor = [
    'text-destructive',
    'text-destructive',
    'text-amber-600',
    'text-yellow-600',
    'text-emerald-600',
  ][score];
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1.5 flex-1 rounded-full ${i < score ? color : 'bg-muted'}`} />
        ))}
      </div>
      <p className={`text-xs ${textColor}`}>{labels[score]}</p>
    </div>
  );
}

function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };
  return (
    <Button type="button" variant="outline" size="sm" onClick={copy} className="shrink-0 gap-1.5">
      {done ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? 'Copied' : label}
    </Button>
  );
}

function IconInput({
  icon: Icon,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type={type}
        className="pl-9"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function FeaturePill({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-2.5 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
      <Icon className="h-3.5 w-3.5 text-primary" /> {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm">{label}</Label>
      {children}
    </div>
  );
}
