const SOCKET_EVENTS = {
  EMIT: {
    SEND_MESSAGE: 'send_message',
    JOIN_THREAD: 'join_thread',
    LEAVE_THREAD: 'leave_thread',
  },
  LISTNERS: {
    MESSAGE_SENT: 'message_sent',
    NEW_MESSAGE: 'new_message',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
  },
};

export default SOCKET_EVENTS;
