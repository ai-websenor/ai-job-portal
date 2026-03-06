import { io, Socket } from 'socket.io-client';
import APP_CONFIG from '../config/config';

class SocketService {
  public socket: Socket | null = null;

  connect(token: string) {
    if (!this.socket) {
      const socketUrl = APP_CONFIG.API_BASE_URL?.replace('/api/v1', '/');

      this.socket = io(socketUrl, {
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        autoConnect: true,
        auth: {
          token,
        },
      });

      this.socket.on('connect', () => {
        console.log('Connected to Websocket server: ', this.socket?.id);
      });

      this.socket.on('connect_error', (err) => {
        console.log('Socket connection error:', err.message);
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
