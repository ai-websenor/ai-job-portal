import { io, Socket } from 'socket.io-client';
import APP_CONFIG from '../config/config';
import SOCKET_EVENTS from './socket-events';
import useChatStore from '../store/useChatStore';

class SocketService {
  public socket: Socket | null = null;

  connect(token: string) {
    if (!this.socket) {
      const socketUrl = APP_CONFIG.API_BASE_URL?.replace('/api/v1', '/messaging');

      this.socket = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        autoConnect: true,
        auth: {
          token,
        },
      });

      this.socket.on('connect', () => {
        console.log('🟢 Socket connected: ', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.log('🔴 Socket connection error:', err.message);
      });

      this.socket.on(SOCKET_EVENTS.LISTNERS.USER_ONLINE, (d) => {
        const onlineUsers = useChatStore.getState().onlineUsers ?? {};
        onlineUsers[d?.userId] = d?.userId;
        useChatStore.getState().setOnlineUsers({ ...onlineUsers });
      });

      this.socket.on(SOCKET_EVENTS.LISTNERS.USER_OFFLINE, (d) => {
        const onlineUsers = useChatStore.getState().onlineUsers ?? {};
        delete onlineUsers[d?.userId];
        useChatStore.getState().setOnlineUsers({ ...onlineUsers });
      });
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any) {
    this.socket?.emit(event, data);
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socket = new SocketService();
export default socket;
