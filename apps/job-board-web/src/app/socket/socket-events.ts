const SOCKET_EVENTS = {
  EMIT: {
    SEND_MESSAGE: 'send_message',
  },
  LISTNERS: {
    MESSAGE_SENT: 'message_sent',
    NEW_MESSAGE: 'new_message',
    MESSAGE_DELIVERED: 'message_delivered',
    MESSAGE_READ: 'message_read',
    USER_TYPING: 'user_typing',
    USER_TYPING_STOP: 'user_stop_typing',
    USER_ONLINE: 'user_online',
    USER_OFFLINE: 'user_offline',
  },
};

export default SOCKET_EVENTS;
