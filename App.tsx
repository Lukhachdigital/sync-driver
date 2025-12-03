import React, { useState, useEffect, useRef } from 'react';
import { Settings, Edit3, Cloud, RefreshCw, Play, ArrowRight, Zap, Info, Loader2, Database, Trash2, Folder } from 'lucide-react';
import { CloudProvider, SyncTask, SyncMode, ProviderType } from './types';
import { CloudSelectorModal } from './components/CloudSelectorModal';
import { initializeGoogleApi, handleAuthClick, setClientId as setServiceClientId, listImageFiles, copyFile, listFileNamesInFolder } from './services/googleDriveService';

const App: React.FC = () => {
  // State
  const [syncMode, setSyncMode] = useState<SyncMode>('realtime');
  
  const [source, setSource] = useState<CloudProvider | null>(null);
  const [destination, setDestination] = useState<CloudProvider | null>(null);
  
  const [googleClientId, setGoogleClientId] = useState('320099579191-ahhkojashkfi035i99j5rpcdrofjltoj.apps.googleusercontent.com');
  const [connectedDrives, setConnectedDrives] = useState<CloudProvider[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [activeSelectionSide, setActiveSelectionSide] = useState<'source' | 'destination'>('source');

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(isSyncing); // Use a ref to track syncing state in intervals
  isSyncingRef.current = isSyncing;


  // Initialize Google API on mount
  useEffect(() => {
    const initApi = async () => {
      try {
        await initializeGoogleApi();
        console.log("Google API initialized");
        if (googleClientId) {
          setServiceClientId(googleClientId);
        }
      } catch (error) {
        console.error("Fatal error initializing Google API:", error);
        alert("Could not initialize Google services. Please check your internet connection or ad-blocker and refresh the page.");
      }
    };
    
    initApi();
  }, [googleClientId]);

  const handleSyncNow = async () => {
    if (!source?.selectedFolder || !destination?.selectedFolder) {
      console.warn("Sync cancelled: Source or destination folder not selected.");
      return;
    }

    if (isSyncingRef.current) {
        console.log("Sync check skipped: another sync is already in progress.");
        return;
    }
    
    setIsSyncing(true);
    try {
      const sourceImages = await listImageFiles(source.selectedFolder.id);
      if (sourceImages.length === 0) {
        console.log("No image files found in the source folder to sync.");
        return;
      }
      
      const destFileNames = await listFileNamesInFolder(destination.selectedFolder.id);
      const filesToCopy = sourceImages.filter(image => !destFileNames.has(image.name));

      if (filesToCopy.length === 0) {
        console.log("All images are already synced. No new files to copy.");
        return;
      }

      console.log(`Syncing ${filesToCopy.length} new image(s)...`);
      const copyPromises = filesToCopy.map(file => 
        copyFile(file.id, file.name, destination.selectedFolder.id)
      );
      
      await Promise.all(copyPromises);
      console.log(`Successfully synced ${filesToCopy.length} new image(s) to the destination folder!`);

    } catch (error: any) {
      console.error("Sync failed:", error);
      const errorMessage = error?.result?.error?.message || error.message || JSON.stringify(error);
      // Keep error alert for critical failures
      alert(`An error occurred during sync: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Effect for Real Time Sync
  useEffect(() => {
    if (syncMode !== 'realtime' || !source?.selectedFolder || !destination?.selectedFolder) {
      return; // Exit if not in real-time mode or if folders are not set
    }

    // Perform an initial sync check when conditions are first met
    handleSyncNow();

    const intervalId = setInterval(() => {
      handleSyncNow();
    }, 10000); // Check for new files every 10 seconds

    // Cleanup function to clear the interval
    return () => {
      clearInterval(intervalId);
    };
  }, [syncMode, source, destination]);


  const openSelector = (side: 'source' | 'destination') => {
    setActiveSelectionSide(side);
    setModalOpen(true);
  };

  const handleSelectCloud = (provider: CloudProvider) => {
    if (activeSelectionSide === 'source') {
      setSource(provider);
    } else {
      setDestination(provider);
    }
    setModalOpen(false);
  };

  const handleAddDrive = async (type: ProviderType): Promise<CloudProvider | null> => {
    if (type === 'Google Drive') {
      try {
        const authResult = await handleAuthClick();
        
        const newDrive: CloudProvider = {
          id: `gd-${Date.now()}`,
          name: 'Google Drive',
          type: 'Google Drive',
          email: authResult.email,
          isConnected: true,
          accessToken: authResult.accessToken
        };

        setConnectedDrives(prev => [...prev, newDrive]);
        return newDrive;
      } catch (error) {
        console.error("Auth failed", error);
        alert("Authentication failed. Check Client ID and Origins.");
        return null;
      }
    }
    return null;
  };

  const renderSelectedCard = (provider: CloudProvider, type: 'source' | 'destination') => {
    const isSource = type === 'source';
    const theme = {
      bg: isSource ? 'bg-slate-700/20' : 'bg-purple-500/10',
      border: isSource ? 'border-blue-500/30 hover:border-blue-500/60' : 'border-purple-500/30 hover:border-purple-500/60',
      iconContainerBorder: isSource ? 'border-blue-500/10' : 'border-purple-500/20',
      folderBorder: isSource ? 'border-blue-500/20' : 'border-purple-500/20',
      folderIconColor: isSource ? 'text-blue-400' : 'text-purple-400',
      labelBg: isSource ? 'bg-blue-500/10' : 'bg-purple-500/10',
      labelColor: isSource ? 'text-blue-300' : 'text-purple-300',
      icon: isSource ? <Database className="w-10 h-10 text-blue-400" /> : <Cloud className="w-10 h-10 text-purple-400" />,
      label: isSource ? 'SOURCE' : 'DESTINATION'
    };

    return (
      <div
        onClick={() => openSelector(type)}
        className={`relative flex-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-8 group ${theme.bg} ${theme.border}`}
      >
        <div className="absolute top-4 right-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isSource) setSource(null);
              else setDestination(null);
            }}
            className="p-1.5 hover:bg-red-500/10 rounded-full text-slate-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className={`w-20 h-20 bg-slate-800 rounded-2xl shadow-sm border ${theme.iconContainerBorder} flex items-center justify-center mb-6`}>
          {theme.icon}
        </div>
        <h3 className="text-xl font-bold text-slate-100 mb-1">{provider.name}</h3>
        <p className="text-slate-400 text-sm mb-4">{provider.email}</p>
        <div className={`w-full bg-slate-900 rounded border ${theme.folderBorder} p-3 flex items-center gap-2 text-sm text-slate-300`}>
          <Folder className={`w-4 h-4 ${theme.folderIconColor}`} />
          <span className="truncate">{provider.selectedFolder?.path || 'Root Folder'}</span>
        </div>
        <div className={`mt-6 flex items-center gap-2 text-xs font-medium ${theme.labelColor} ${theme.labelBg} px-3 py-1 rounded-full`}>
          {theme.label}
        </div>
      </div>
    );
  };

  const renderEmptyCard = (type: 'source' | 'destination') => {
    const isSource = type === 'source';
    return (
      <div
        onClick={() => openSelector(type)}
        className="relative flex-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-8 group bg-slate-800/20 border-dashed border-slate-600 hover:border-primary-500 hover:bg-slate-800/50"
      >
        <div className="w-20 h-20 rounded-full border-2 border-slate-600 border-dashed flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary-500 group-hover:text-primary-400 text-slate-600 transition-all duration-300">
          <span className="text-4xl font-light pb-1">+</span>
        </div>
        <h3 className="text-2xl font-semibold text-slate-500 group-hover:text-primary-400 transition-colors">{isSource ? 'FROM' : 'TO'}</h3>
        <p className="text-slate-500 mt-3 text-sm text-center max-w-[200px] leading-relaxed">
          Select {isSource ? 'Source' : 'Target'} Drive & Folder
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-primary-500/20">
      <CloudSelectorModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSelect={handleSelectCloud} 
        side={activeSelectionSide}
        connectedDrives={connectedDrives}
        onAddDrive={handleAddDrive}
        clientId={googleClientId}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col">
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">Cloud Sync</h1>
          <p className="text-slate-400 mt-1 text-sm">Tự động đồng bộ hoá và sao chép các tệp ảnh mới giữa các thư mục Google Drive.</p>
        </div>

        <div className="flex space-x-1 mb-6">
          <button 
            onClick={() => setSyncMode('normal')}
            className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              syncMode === 'normal' 
                ? 'bg-slate-800 text-primary-400 shadow-[0_-2px_6px_rgba(0,0,0,0.1)] border-t border-x border-slate-700 z-10' 
                : 'bg-transparent text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            Normal Sync
          </button>
          <button 
            onClick={() => setSyncMode('realtime')}
            className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              syncMode === 'realtime' 
                ? 'bg-primary-600 text-white shadow-md z-10' 
                : 'bg-transparent text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            Real Time Sync
          </button>
        </div>

        <div className="bg-slate-800 rounded-b-xl rounded-tr-xl shadow-lg border border-slate-700 p-6 flex-1 min-h-[300px] flex flex-col">
           
           <div className="flex flex-col lg:flex-row items-center justify-between gap-10 h-full">
              
              <div className="flex-1 w-full h-full flex flex-col">
                {source ? renderSelectedCard(source, 'source') : renderEmptyCard('source')}
              </div>

              <div className="shrink-0 flex flex-col items-center justify-center w-full lg:w-48 z-10 space-y-6">
                 <div className="relative w-full flex items-center justify-center h-12">
                   <div className="absolute inset-0 flex items-center">
                     <div className="w-full border-t-2 border-dashed border-slate-700"></div>
                   </div>
                   <div className="relative bg-slate-800 p-2 rounded-full border border-slate-700 shadow-sm z-10">
                      <ArrowRight className="w-8 h-8 text-primary-500" />
                   </div>
                 </div>

                 <button 
                  onClick={handleSyncNow}
                  disabled={!source || !destination || isSyncing}
                  className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary-500/10 transition-all transform active:scale-95 w-[160px] text-base
                    ${source && destination 
                      ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer' 
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed shadow-none'
                    }`}
                 >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        Sync Now
                      </>
                    )}
                 </button>
              </div>

              <div className="flex-1 w-full h-full flex flex-col">
                {destination ? renderSelectedCard(destination, 'destination') : renderEmptyCard('destination')}
              </div>
           </div>
        </div>

        <footer className="text-center py-6">
            <p className="text-yellow-400 text-base font-semibold">Ứng dụng được phát triển bởi Mr. Huỳnh Xuyên Sơn</p>
        </footer>

      </div>
    </div>
  );
};

export default App;