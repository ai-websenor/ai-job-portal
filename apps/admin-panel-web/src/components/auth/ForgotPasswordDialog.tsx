import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import http from '@/api/http';
import endpoints from '@/api/endpoints';
import { Lock, Mail, Loader2, Eye, EyeOff, KeyRound } from 'lucide-react';

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'email' | 'otp' | 'reset';

// Mirrors the backend policy: min 8, upper, lower, number, special character
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const { toast } = useToast();

  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const reset = () => {
    setStep('email');
    setEmail('');
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirm(false);
    setIsLoading(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  // Step 1: request OTP
  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      await http.post(endpoints.auth.forgotPassword, { email: email.trim().toLowerCase() });
      toast({
        title: 'Code sent',
        description: 'If the email exists, a 6-digit code has been sent to it.',
      });
      setStep('otp');
    } catch {
      // interceptor already shows a toast
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: verify OTP -> get reset token
  const submitOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast({
        title: 'Invalid code',
        description: 'Enter the 6-digit code.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    try {
      const res = (await http.post(endpoints.auth.verifyForgotOtp, {
        email: email.trim().toLowerCase(),
        otp,
      })) as {
        data?: { resetPasswordToken?: string };
        resetPasswordToken?: string;
      };
      const token = res?.data?.resetPasswordToken ?? res?.resetPasswordToken;
      if (!token) {
        toast({
          title: 'Verification failed',
          description: 'No reset token returned.',
          variant: 'destructive',
        });
        return;
      }
      setResetToken(token);
      setStep('reset');
    } catch {
      // interceptor already shows a toast
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: set new password
  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PASSWORD_REGEX.test(newPassword)) {
      toast({
        title: 'Weak password',
        description:
          'Use at least 8 characters with uppercase, lowercase, number, and special character.',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await http.post(endpoints.auth.resetPassword, {
        resetPasswordToken: resetToken,
        newPassword,
        confirmPassword,
      });
      toast({
        title: 'Password reset',
        description: 'You can now sign in with your new password.',
      });
      handleClose(false);
    } catch {
      // interceptor already shows a toast
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'email' && 'Reset your password'}
            {step === 'otp' && 'Enter verification code'}
            {step === 'reset' && 'Set a new password'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email' && 'Enter your admin email and we will send you a verification code.'}
            {step === 'otp' && `We sent a 6-digit code to ${email}.`}
            {step === 'reset' && 'Choose a strong password for your account.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={submitEmail} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-email" className="text-sm font-semibold">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-email"
                  type="email"
                  placeholder="admin@example.com"
                  className="h-11 pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send Code
            </Button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={submitOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-otp" className="text-sm font-semibold">
                Verification Code
              </Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-otp"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="6-digit code"
                  className="h-11 pl-10 tracking-[0.4em]"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  autoFocus
                />
              </div>
            </div>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Verify Code
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setStep('email')}
              disabled={isLoading}
            >
              Use a different email
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={submitReset} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fp-new" className="text-sm font-semibold">
                New Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-new"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className="h-11 pl-10 pr-10"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="fp-confirm" className="text-sm font-semibold">
                Confirm Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fp-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  className="h-11 pl-10 pr-10"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((p) => !p)}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              At least 8 characters with uppercase, lowercase, number, and special character.
            </p>
            <Button type="submit" className="w-full h-11" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reset Password
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
