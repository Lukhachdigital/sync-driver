export type SyncMode = 'normal' | 'realtime';

export type ProviderType = 'Google Drive' | 'Dropbox' | 'OneDrive' | 'Box' | 'FTP';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  thumbnailLink?: string;
  iconLink?: string;
}

export interface CloudProvider {
  id: string;
  name: string; // The account name (e.g. "Google Drive")
  type: ProviderType;
  icon?: string; 
  totalSpace?: string;
  usedSpace?: string;
  email?: string; // For identifying specific google accounts
  isConnected?: boolean;
  accessToken?: string; // Store token for API calls
  selectedFolder?: {
    id: string;
    name: string;
    path: string;
  };
}

export interface SyncTask {
  id: string;
  name: string;
  source: CloudProvider | null;
  destination: CloudProvider | null;
  mode: SyncMode;
  isTwoWay: boolean;
}
