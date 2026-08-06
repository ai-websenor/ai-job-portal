import dayjs from 'dayjs';
import routePaths from '../config/routePaths';
import useUserStore from '../store/useUserStore';
import ENDPOINTS from '../api/endpoints';
import axios from 'axios';
import APP_CONFIG from '../config/config';
import {
  ActiveStatus,
  InterviewStatus,
  JobStatus,
  SubscriptionStatus,
  TransactionStatus,
  VideoResumeStatus,
} from '../types/enum';
import useChatStore from '../store/useChatStore';
import useNotificationStore from '../store/useNotificationStore';
import { themeColors } from '../config/data';

class CommonUtils {
  static toTitleCase(value: string = '') {
    if (!value) return '';

    return value
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/(^|[\s-])[a-z]/g, (match) => match.toUpperCase());
  }

  static toCamelCase(value: string = '') {
    if (!value) return '';

    return value.replace(/[A-Za-z]+(?:'[A-Za-z]+)?/g, (word) => {
      return `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`;
    });
  }

  static formatPersonName(value: string = '', options: { allowSpaces?: boolean } = {}) {
    const { allowSpaces = true } = options;
    const sanitizedValue = allowSpaces
      ? value.replace(/[^\p{L}\s]/gu, '')
      : value.replace(/[^\p{L}]/gu, '');

    return CommonUtils.toCamelCase(sanitizedValue);
  }

  static formatCompanyName(value: string = '', options: { allowSpaces?: boolean } = {}) {
    return CommonUtils.formatPersonName(value, options);
  }

  static isPersonNameCharacter(value: string, options: { allowSpaces?: boolean } = {}) {
    const { allowSpaces = true } = options;

    return allowSpaces ? /^[\p{L}\s]$/u.test(value) : /^\p{L}$/u.test(value);
  }

  static formatMessageTime(date: string | Date | null | undefined): string {
    if (!date) return '';
    return dayjs(date).format('hh:mm A');
  }

  static formatChatListDate(date: string | Date | null | undefined): string {
    if (!date) return '';
    const now = dayjs();
    const target = dayjs(date);

    if (target.isSame(now, 'day')) {
      return target.format('hh:mm A');
    }

    if (target.isSame(now.subtract(1, 'day'), 'day')) {
      return 'Yesterday';
    }

    return target.format('DD MMM YYYY');
  }

  static toUpperCase(value: string = '') {
    if (!value) return '';

    return value.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  static async onLogout() {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      useUserStore.getState().clearUser();
      useChatStore.getState().clearChats();
      useNotificationStore.getState().clearNotifications();

      window.location.href = routePaths.home;
    }
  }

  static keyIntoTitle(key: string) {
    if (!key) return '';
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/[_-]+/g, ' ')
      .trim()
      .replace(/^(.)/, (match) => match.toUpperCase());
  }

  // Display label for an interview type. When type is "other" the employer-typed
  // custom name is shown instead of the literal "Other".
  static interviewTypeLabel(interviewType?: string, customType?: string | null) {
    if (interviewType === 'other' && customType) return customType;
    return CommonUtils.keyIntoTitle(interviewType || '');
  }

  static determineDays(date: string) {
    const today = dayjs();
    const jobDate = dayjs(date);
    const diffInDays = today.diff(jobDate, 'day');
    if (diffInDays === 0) {
      return 'Today';
    }
    if (diffInDays === 1) {
      return '1 day ago';
    }
    return `${diffInDays} days ago`;
  }

  static async refreshToken() {
    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null;

    if (!refreshToken) throw new Error('No refresh token');

    const response = await axios.post(`${APP_CONFIG.API_BASE_URL}${ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
      refreshToken,
    });

    const data = response.data?.data;

    if (data?.accessToken) {
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return data;
    }

    throw new Error('Refresh failed');
  }

  static formatSalary(salaryMin: number = 0, salaryMax: number = 0) {
    if (!salaryMin && !salaryMax) return 'Salary Undisclosed';
    return `${APP_CONFIG.CURRENCY}${salaryMin} - ${APP_CONFIG.CURRENCY}${salaryMax}`;
  }

  static formatCompanyClientName(companyName?: string | null, clientName?: string | null) {
    const formattedCompanyName = companyName?.trim();
    const formattedClientName = clientName?.trim();

    if (formattedCompanyName && formattedClientName) {
      return `${formattedCompanyName} (Client: ${formattedClientName})`;
    }

    return formattedCompanyName || formattedClientName || '';
  }

  static getStatusColor(status: string) {
    if (!status) return 'default';

    switch (status?.toLowerCase()) {
      case VideoResumeStatus.approved:
      case InterviewStatus.hired:
      case ActiveStatus.active:
      case InterviewStatus.completed:
      case InterviewStatus.interview_completed:
      case TransactionStatus.success:
        return 'success';

      case VideoResumeStatus.pending:
      case ActiveStatus.inactive:
      case InterviewStatus.shortlisted:
      case TransactionStatus.pending:
      case JobStatus.hold:
      case InterviewStatus.confirmed:
      case InterviewStatus.in_progress:
      case InterviewStatus.interview_in_progress:
        return 'warning';

      case InterviewStatus.rescheduled:
      case InterviewStatus.interview_rescheduled:
      case InterviewStatus.interview_scheduled:
      case InterviewStatus.scheduled:
      case TransactionStatus.refunded:
        return 'primary';

      case VideoResumeStatus.rejected:
      case InterviewStatus.withdrawn:
      case TransactionStatus.failed:
      case SubscriptionStatus.expired:
      case 'cancelled':
      case 'canceled':
      case InterviewStatus.interview_cancelled:
      case 'deleted':
        return 'danger';

      default:
        return 'default';
    }
  }

  static getSupportStatusColor(status: string) {
    if (!status) return 'default';
    switch (status.toLowerCase()) {
      case 'open':
        return 'primary';
      case 'in_progress':
        return 'warning';
      case 'resolved':
        return 'success';
      case 'closed':
        return 'default';
      default:
        return 'default';
    }
  }

  static getSupportPriorityColor(priority: string) {
    if (!priority) return 'default';
    switch (priority.toLowerCase()) {
      case 'low':
        return 'default';
      case 'medium':
        return 'primary';
      case 'high':
        return 'warning';
      case 'urgent':
        return 'danger';
      default:
        return 'default';
    }
  }

  static async getVideoDurationByUrl(url: string) {
    const duration = await new Promise((resolve) => {
      const tempVideo = document.createElement('video');
      tempVideo.preload = 'metadata';
      tempVideo.src = url;
      tempVideo.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(tempVideo.duration);
      };
    });

    return (duration as number) ?? 0;
  }

  static async getVideoSizeByUrl(url: string) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (!response.ok) return 0;
      const size = response.headers.get('content-length');
      return size ? parseInt(size, 10) : 0;
    } catch (error) {
      console.log('Failed to fetch video size:', error);
      return 0;
    }
  }

  static getFileNameByUrl(url: string) {
    if (!url) return 'Unknown';
    const urlObj = new URL(url);
    return urlObj.pathname.split('/').pop() || 'Unknown';
  }

  static applyTheme(theme: (typeof themeColors)[0]) {
    document.documentElement.style.setProperty('--primary-color', theme.colors.primary);
    document.documentElement.style.setProperty('--secondary-color', theme.colors.secondary);
  }

  static getInterviewTypeLabel(value: string = '') {
    if (!value) return '';

    switch (value.toLowerCase()) {
      case 'phone':
        return 'Phone screening';
      case 'video':
        return 'Video';
      case 'in_person':
        return 'In-person';
      case 'technical':
        return 'Technical';
      case 'hr':
        return 'HR round';
      case 'panel':
        return 'Panel';
      case 'assessment':
        return 'Assessment';
      default:
        return CommonUtils.keyIntoTitle(value);
    }
  }

  static getInterviewStatusLabel(value: string = '') {
    if (!value) return '';

    switch (value.toLowerCase()) {
      case 'interview_completed':
        return 'Interview completed';
      case 'interview_rescheduled':
        return 'Interview rescheduled';
      case 'interview_cancelled':
        return 'Interview cancelled';
      case 'interview_in_progress':
      case 'in_progress':
        return 'In progress';
      default:
        return CommonUtils.keyIntoTitle(value);
    }
  }

  static getFullName(params: { firstName: string; lastName: string }) {
    if (!params?.firstName && !params?.lastName) return '';
    return [params.firstName, params.lastName].filter(Boolean).join(' ');
  }

  static getInitials(value: string = '') {
    if (!value) return '';

    const words = value
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (!words.length) return '';

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase();
    }

    return `${words[0].charAt(0)}${words[words.length - 1].charAt(0)}`.toUpperCase();
  }

  static getShortId(value: string = '', length = 12) {
    if (!value) return '';
    if (value.length <= length) return value;

    return value.slice(-length).toUpperCase();
  }

  static disableNumberInputWheel(root?: Document | HTMLElement) {
    if (typeof document === 'undefined') {
      return () => {};
    }

    const targetRoot = root ?? document;
    const preventWheelChange = (event: Event) => {
      const target = event.target;

      if (!(target instanceof HTMLInputElement) || target.type !== 'number') {
        return;
      }

      if (target.ownerDocument.activeElement !== target) {
        return;
      }

      event.preventDefault();
      target.blur();
    };

    targetRoot.addEventListener('wheel', preventWheelChange, { capture: true, passive: false });

    return () => {
      targetRoot.removeEventListener('wheel', preventWheelChange, true);
    };
  }

  /**
   * Normalize a description value to bullet lines.
   * Parsed resumes deliver an array (one entry per bullet); saved records
   * deliver a newline-joined string.
   */
  static toBulletLines(value?: string | string[] | null): string[] {
    if (!value) return [];

    const parts = Array.isArray(value) ? value : value.split(/\r?\n/);

    return parts.map((part) => String(part).trim()).filter(Boolean);
  }

  /** Collapse a description value into the newline-joined string form used by form inputs. */
  static toBulletText(value?: string | string[] | null): string {
    return CommonUtils.toBulletLines(value).join('\n');
  }
}

export default CommonUtils;
