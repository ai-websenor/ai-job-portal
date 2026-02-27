import dayjs from 'dayjs';
import routePaths from '../config/routePaths';
import useUserStore from '../store/useUserStore';
import ENDPOINTS from '../api/endpoints';
import axios from 'axios';
import APP_CONFIG from '../config/config';
import { ActiveStatus, InterviewStatus, Roles, VideoResumeStatus } from '../types/enum';
import useChatStore from '../store/useChatStore';
import useNotificationStore from '../store/useNotificationStore';

class CommonUtils {
  static async onLogout() {
    if (typeof window !== 'undefined') {
      localStorage.clear();
      useUserStore.getState().clearUser();
      useChatStore.getState().clearChats();
      useNotificationStore.getState().clearNotifications();

      window.location.href = routePaths.auth.login;
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

  static getStatusColor(status: string) {
    if (!status) return 'default';

    switch (status?.toLowerCase()) {
      case VideoResumeStatus.approved:
      case ActiveStatus.active:
      case InterviewStatus.hired:
      case InterviewStatus.offer_accepted:
        return 'success';

      case InterviewStatus.shortlisted:
      case InterviewStatus.interview_scheduled:
        return 'primary';

      case VideoResumeStatus.pending:
      case ActiveStatus.inactive:
      case InterviewStatus.applied:
        return 'warning';

      case InterviewStatus.viewed:
        return 'secondary';

      case VideoResumeStatus.rejected:
      case InterviewStatus.rejected:
      case InterviewStatus.offer_rejected:
      case InterviewStatus.withdrawn:
      case 'deleted':
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
}

export default CommonUtils;
