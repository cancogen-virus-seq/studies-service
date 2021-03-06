// ** evn **
export const SERVER_PORT = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : 3001;

export const SONG_URL = process.env.SONG_URL || 'http://localhost:808';
export const EGO_URL = process.env.EGO_URL || 'http://localhost:808';

export const OAUTH_CLIENT_ID = process.env.OAUTH_CLIENT_ID || 'id';
export const OAUTH_CLIENT_SECRET = process.env.OAUTH_CLIENT_SECRET || 'secret';
export const EGO_STUDY_PREFIX = process.env.EGO_STUDY_PREFIX || 'STUDY-';

export const SCOPES_WRITE = process.env.SCOPES_WRITE || 'COLLABORATOR.WRITE';

// ** constants **
export const EGO_OAUTH_ENDPOINT = '/oauth/token';
export const EGO_PUBLIC_KEY_ENDPOINT = '/oauth/token/public_key';
