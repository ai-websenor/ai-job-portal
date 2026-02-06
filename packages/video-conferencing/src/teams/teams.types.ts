export interface AzureTokenResponse {
  token_type: string;
  expires_in: number;
  ext_expires_in: number;
  access_token: string;
}

export interface TeamsMeetingRequest {
  startDateTime: string;
  endDateTime: string;
  subject: string;
  participants?: {
    organizer?: {
      identity: {
        user: {
          id: string;
        };
      };
    };
    attendees?: Array<{
      identity: {
        user: {
          id: string;
        };
      };
      upn?: string;
    }>;
  };
  lobbyBypassSettings?: {
    scope: 'organization' | 'everyone' | 'organizer' | 'organizationAndFederated';
    isDialInBypassEnabled?: boolean;
  };
}

export interface TeamsMeetingResponse {
  id: string;
  creationDateTime: string;
  startDateTime: string;
  endDateTime: string;
  joinUrl: string;
  joinWebUrl: string;
  subject: string;
  isBroadcast: boolean;
  autoAdmittedUsers: string;
  outerMeetingAutoAdmittedUsers: string | null;
  capabilities: string[];
  videoTeleconferenceId: string;
  externalId: string | null;
  audioConferencing?: {
    conferenceId: string;
    tollNumber: string;
    tollFreeNumber?: string;
    dialinUrl: string;
  };
  chatInfo: {
    threadId: string;
    messageId: string;
    replyChainMessageId: string | null;
  };
  joinInformation: {
    content: string;
    contentType: string;
  };
}

export interface GraphUser {
  id: string;
  displayName: string;
  mail: string;
  userPrincipalName: string;
}
