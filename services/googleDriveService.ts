import { DriveFile } from "../types";

declare var gapi: any;
declare var google: any;

let CLIENT_ID = ''; 
const API_KEY = ''; // Optional: Use if you have a public API key
const DISCOVERY_DOCS = ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'];
// IMPORTANT: Scope remains 'drive' to allow full file operations.
const SCOPES = 'https://www.googleapis.com/auth/drive';

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
  // This function remains largely the same, setting up the global gapi/gis clients.
  // The actual authentication token will be handled on a per-request basis.
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

    // This callback will provide a token specific to the user who just logged in.
    tokenClient.callback = async (resp: any) => {
      if (resp.error) {
        return reject(resp);
      }
      
      // Temporarily set the token to fetch user info for THIS login
      gapi.client.setToken({ access_token: resp.access_token });
      
      let email = 'Google User';
      try {
        const userInfo = await gapi.client.drive.about.get({
          fields: 'user(emailAddress, displayName)'
        });
        email = userInfo.result.user.emailAddress;
      } catch (e) {
        console.warn("Could not fetch user info", e);
      }
      
      // IMPORTANT: Clear the global token so we don't rely on it by mistake.
      gapi.client.setToken(null);

      resolve({ accessToken: resp.access_token, email });
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};


// All API calls now require an accessToken to be passed explicitly.
export const listFiles = async (folderId: string = 'root', accessToken: string, queryExtra: string = '', fields: string = "nextPageToken, files(id, name, mimeType, iconLink, thumbnailLink)"): Promise<DriveFile[]> => {
  try {
    const response = await gapi.client.request({
      path: 'https://www.googleapis.com/drive/v3/files',
      method: 'GET',
      params: {
        pageSize: 1000,
        fields: fields,
        q: `'${folderId}' in parents and trashed = false ${queryExtra}`,
        orderBy: 'folder, name'
      },
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    return response.result.files || [];
  } catch (err) {
    console.error("Error listing files", err);
    throw err;
  }
};

export const listImageFiles = async (folderId: string, accessToken: string): Promise<DriveFile[]> => {
  return await listFiles(folderId, accessToken, "and mimeType contains 'image/'");
};

export const listFileNamesInFolder = async (folderId: string, accessToken: string): Promise<Set<string>> => {
  const files = await listFiles(folderId, accessToken, "", "files(name)");
  const names = new Set<string>();
  if (files) {
    for (const file of files) {
      if(file.name) {
         names.add(file.name);
      }
    }
  }
  return names;
};

/**
 * Transfers a file from a source account to a destination account.
 * This is a two-step process: download from source, then upload to destination.
 * A direct 'copy' is not possible across different Google accounts.
 */
export const transferFile = async (
  sourceFile: DriveFile,
  destinationFolderId: string,
  sourceToken: string,
  destinationToken: string
): Promise<any> => {
  try {
    // Step 1: Download the file content from the source account
    const downloadResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${sourceFile.id}?alt=media`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${sourceToken}`
      }
    });

    if (!downloadResponse.ok) {
      const errorText = await downloadResponse.text();
      throw new Error(`Failed to download file: ${downloadResponse.statusText} - ${errorText}`);
    }
    const fileBlob = await downloadResponse.blob();

    // Step 2: Upload the file content to the destination account
    const metadata = {
      name: sourceFile.name,
      parents: [destinationFolderId],
      mimeType: sourceFile.mimeType
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', fileBlob);

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${destinationToken}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
       const errorText = await uploadResponse.text();
       throw new Error(`Failed to upload file: ${uploadResponse.statusText} - ${errorText}`);
    }

    return await uploadResponse.json();

  } catch (err) {
    console.error(`Error transferring file: ${sourceFile.name} (ID: ${sourceFile.id}). Details:`, err);
    throw err;
  }
};
