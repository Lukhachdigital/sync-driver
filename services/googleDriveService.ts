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
  if (gisInited && CLIENT_ID && !tokenClient) {
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

export const initializeGoogleApi = async (): Promise<void> => {
  const gapiLoaded = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
        clearInterval(checkGapi);
        reject(new Error("gapi script failed to load in 10 seconds. Check ad-blockers or network."));
    }, 10000);

    const checkGapi = setInterval(() => {
        if (typeof gapi !== 'undefined' && gapi.load) {
            clearInterval(checkGapi);
            clearTimeout(timeout);
            gapi.load('client', () => {
              gapi.client.init({
                discoveryDocs: DISCOVERY_DOCS,
              }).then(() => {
                gapiInited = true;
                resolve();
              }).catch((err: any) => reject(new Error(`GAPI client init failed: ${err.message}`)));
            });
        }
    }, 100);
  });

  const gisLoaded = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
        clearInterval(checkGis);
        reject(new Error("GIS script failed to load in 10 seconds. Check ad-blockers or network."));
    }, 10000);
    
    const checkGis = setInterval(() => {
        if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
            clearInterval(checkGis);
            clearTimeout(timeout);
            gisInited = true;
            if (CLIENT_ID) {
                initTokenClient();
            }
            resolve();
        }
    }, 100);
  });

  await Promise.all([gapiLoaded, gisLoaded]);
};

export const handleAuthClick = (): Promise<{ accessToken: string, email?: string }> => {
  return new Promise((resolve, reject) => {
    if (!CLIENT_ID) {
      return reject(new Error("Missing Client ID"));
    }

    if (!tokenClient) {
        initTokenClient();
        if (!tokenClient) {
             return reject(new Error("Google Identity Services not initialized. Please try refreshing the page."));
        }
    }

    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        return reject(resp);
      }
      
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