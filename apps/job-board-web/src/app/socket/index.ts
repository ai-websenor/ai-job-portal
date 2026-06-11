import { io, Socket } from 'socket.io-client';
import APP_CONFIG from '../config/config';
import SOCKET_EVENTS from './socket-events';
import useChatStore from '../store/useChatStore';

class SocketService {
  public socket: Socket | null = null;

  // Components mount (and register listeners / join rooms) before the layout
  // effect calls connect(), so everything registered early is buffered here and
  // replayed once the socket exists. Listeners are kept across reconnects.
  private pendingListeners: Array<{ event: string; callback: (...args: any[]) => void }> = [];
  private pendingEmits: Array<{ event: string; data: any }> = [];

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

      for (const { event, callback } of this.pendingListeners) {
        this.socket.on(event, callback);
      }
      for (const { event, data } of this.pendingEmits) {
        this.socket.emit(event, data);
      }
      this.pendingEmits = [];
    }
  }

  on(event: string, callback: (...args: any[]) => void) {
    this.pendingListeners.push({ event, callback });
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (...args: any[]) => void) {
    this.pendingListeners = this.pendingListeners.filter(
      (l) => l.event !== event || (callback !== undefined && l.callback !== callback),
    );
    this.socket?.off(event, callback);
  }

  emit(event: string, data: any) {
    if (this.socket) {
      // socket.io buffers emits itself while (re)connecting
      this.socket.emit(event, data);
    } else {
      this.pendingEmits.push({ event, data });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.pendingEmits = [];
  }
}

const socket = new SocketService();
export default socket;
