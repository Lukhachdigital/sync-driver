import { DriveFile } from "../types";

declare var gapi: any;
declare var google: any;

let CLIENT_ID = ''; 
const API_KEY = ''; // Optional: Use if you have a public API key
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let tokenClient: any = null;
let gapiInited = false;
let gisInited = false;

export const setClientId = (id: string) => {
  CLIENT_ID = id;
  // If scripts are loaded, we can try to init (or re-init) the token client now
  if (gisInited && CLIENT_ID) {
     initTokenClient();
  }
};

const initTokenClient = () => {
    try {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
             tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined at request time
            });
        }
    } catch (error) {
        console.error("Failed to initialize token client", error);
    }
}

export const initializeGoogleApi = async (onLoad: () => void) => {
  const gapiLoaded = new Promise<void>((resolve) => {
    // Wait for gapi to be defined
    const checkGapi = setInterval(() => {
        if (typeof gapi !== 'undefined') {
            clearInterval(checkGapi);
            gapi.load('client', async () => {
              await gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS,
              });
              gapiInited = true;
              resolve();
            });
        }
    }, 100);
  });

  const gisLoaded = new Promise<void>((resolve) => {
    // Wait for google accounts script to be defined
    const checkGis = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            clearInterval(checkGis);
            gisInited = true;
            if (CLIENT_ID) {
                initTokenClient();
            }
            resolve();
        }
    }, 100);
  });

  await Promise.all([gapiLoaded, gisLoaded]);
  onLoad();
};

export const handleAuthClick = (): Promise<{ accessToken: string, email?: string }> => {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      reject(new Error("Missing Client ID"));
      return;
    }

    // Ensure token client is initialized
    if (!tokenClient) {
        initTokenClient();
        if (!tokenClient) {
             reject(new Error("Google Identity Services not initialized. Check internet connection or Client ID."));
             return;
        }
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        reject(resp);
        return;
      }
      
      // Attempt to get user info (email)
      let email = 'Google User';
      try {
        const userInfo = await gapi.client.drive.about.get({
          fields: 'user(emailAddress, displayName)'
        });
        email = userInfo.result.user.emailAddress;
      } catch (e) {
        console.warn("Could not fetch user info", e);
      }

      resolve({ accessToken: resp.access_token, email });
    };

    // Check if we have a valid gapi session (optional, mainly for consistency)
    // We use tokenClient for the actual OAuth popup
    if (gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      tokenClient.requestAccessToken({ prompt: '' });
    }
  });
};

export const listFiles = async (folderId: string = 'root'): Promise<DriveFile[]> => {
  try {
    const response = await gapi.client.drive.files.list({
      'pageSize': 20,
      'fields': "nextPageToken, files(id, name, mimeType, iconLink, thumbnailLink)",
      'q': `'${folderId}' in parents and trashed = false`,
      'orderBy': 'folder, name'
    });
    return response.result.files;
  } catch (err) {
    console.error("Error listing files", err);
    throw err;
  }
};