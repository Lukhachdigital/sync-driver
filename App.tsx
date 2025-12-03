import React, { useState, useEffect } from 'react';
import { Settings, Edit3, Cloud, RefreshCw, Play, ArrowRight, Zap, Info, Loader2, Database, Trash2, Folder } from 'lucide-react';
import { CloudProvider, SyncTask, SyncMode, ProviderType } from './types';
import { CloudSelectorModal } from './components/CloudSelectorModal';
import { initializeGoogleApi, handleAuthClick, setClientId as setServiceClientId, listImageFiles, copyFile, listFileNamesInFolder } from './services/googleDriveService';

const App: React.FC = () => {
  // State
  const [taskName, setTaskName] = useState('Task 1');
  const [syncMode, setSyncMode] = useState<SyncMode>('realtime');
  
  // These hold the FULL provider object, including the specific selected folder
  const [source, setSource] = useState<CloudProvider | null>(null);
  const [destination, setDestination] = useState<CloudProvider | null>(null);
  
  const [isTwoWay, setIsTwoWay] = useState(false);
  const [googleClientId, setGoogleClientId] = useState('320099579191-ahhkojashkfi035i99j5rpcdrofjltoj.apps.googleusercontent.com');

  // Store authenticated drives
  const [connectedDrives, setConnectedDrives] = useState<CloudProvider[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSelectionSide, setActiveSelectionSide] = useState<'source' | 'destination'>('source');

  // Syncing State
  const [isSyncing, setIsSyncing] = useState(false);

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

  // Handlers
  const handleSyncNow = async () => {
    if (!source?.selectedFolder || !destination?.selectedFolder) {
      alert("Please select both a source and a destination folder.");
      return;
    }
    
    setIsSyncing(true);
    try {
      // 1. Get all image files from the source folder
      const sourceImages = await listImageFiles(source.selectedFolder.id);

      if (sourceImages.length === 0) {
        alert("No image files found in the source folder to sync.");
        return;
      }
      
      // 2. Get all file names from the destination folder for quick lookup
      const destFileNames = await listFileNamesInFolder(destination.selectedFolder.id);

      // 3. Filter out images that already exist in the destination
      const filesToCopy = sourceImages.filter(image => !destFileNames.has(image.name));

      if (filesToCopy.length === 0) {
        alert("All images are already synced. No new files to copy.");
        return;
      }

      // 4. Create an array of copy promises to run them in parallel
      const copyPromises = filesToCopy.map(file => 
        copyFile(file.id, file.name, destination.selectedFolder.id)
      );
      
      // 5. Execute all copy operations
      await Promise.all(copyPromises);

      alert(`Successfully synced ${filesToCopy.length} new image(s) to the destination folder!`);

    } catch (error: any) {
      console.error("Sync failed:", error);
      // Enhanced error reporting
      const errorMessage = error?.result?.error?.message || error.message || JSON.stringify(error);
      alert(`An error occurred during sync: ${errorMessage}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Effect for Real Time Sync
  useEffect(() => {
    if (syncMode === 'realtime' && source && destination && !isSyncing) {
      console.log("Real-time sync triggered.");
      handleSyncNow();
    }
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
      bg: isSource ? 'bg-blue-50/30' : 'bg-purple-50/30',
      border: isSource ? 'border-blue-100 hover:border-blue-300' : 'border-purple-100 hover:border-purple-300',
      iconContainerBorder: isSource ? 'border-blue-100' : 'border-purple-100',
      iconColor: isSource ? 'text-blue-600' : 'text-purple-600',
      folderBorder: isSource ? 'border-blue-200' : 'border-purple-200',
      folderIconColor: isSource ? 'text-blue-500' : 'text-purple-500',
      labelBg: isSource ? 'bg-blue-100' : 'bg-purple-100',
      labelColor: isSource ? 'text-blue-700' : 'text-purple-700',
      icon: isSource ? <Database className="w-10 h-10 text-blue-600" /> : <Cloud className="w-10 h-10 text-purple-600" />,
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
            className="p-1.5 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <div className={`w-20 h-20 bg-white rounded-2xl shadow-sm border ${theme.iconContainerBorder} flex items-center justify-center mb-6`}>
          {theme.icon}
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-1">{provider.name}</h3>
        <p className="text-slate-500 text-sm mb-4">{provider.email}</p>
        <div className={`w-full bg-white rounded border ${theme.folderBorder} p-3 flex items-center gap-2 text-sm text-slate-600`}>
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
        className="relative flex-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-8 group bg-slate-50/50 border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50"
      >
        <div className="w-20 h-20 rounded-full border-2 border-slate-300 border-dashed flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary-400 group-hover:text-primary-500 text-slate-300 transition-all duration-300">
          <span className="text-4xl font-light pb-1">+</span>
        </div>
        <h3 className="text-2xl font-semibold text-slate-400 group-hover:text-primary-600 transition-colors">{isSource ? 'FROM' : 'TO'}</h3>
        <p className="text-slate-400 mt-3 text-sm text-center max-w-[200px] leading-relaxed">
          Select {isSource ? 'Source' : 'Target'} Drive & Folder
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FA] text-slate-800 font-sans selection:bg-primary-100">
      <CloudSelectorModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)} 
        onSelect={handleSelectCloud} 
        side={activeSelectionSide}
        connectedDrives={connectedDrives}
        onAddDrive={handleAddDrive}
        clientId={googleClientId}
      />

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col">
        
        {/* Header */}
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cloud Sync</h1>
            <p className="text-slate-500 mt-1 text-sm">Create a sync task to sync files between cloud drives</p>
          </div>
        </div>

        {/* Sync Mode Tabs */}
        <div className="flex space-x-1 mb-6">
          <button 
            onClick={() => setSyncMode('normal')}
            className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              syncMode === 'normal' 
                ? 'bg-white text-primary-600 shadow-[0_-2px_6px_rgba(0,0,0,0.02)] border-t border-x border-gray-100 z-10' 
                : 'bg-transparent text-slate-500 hover:bg-slate-100/50'
            }`}
          >
            Normal Sync
          </button>
          <button 
            onClick={() => setSyncMode('realtime')}
            className={`px-6 py-2.5 text-sm font-medium rounded-t-lg transition-all ${
              syncMode === 'realtime' 
                ? 'bg-primary-600 text-white shadow-md z-10' 
                : 'bg-transparent text-slate-500 hover:bg-slate-100/50'
            }`}
          >
            Real Time Sync
          </button>
        </div>

        {/* Sync Canvas */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex-1 min-h-[500px] flex flex-col">
           
           <div className="flex flex-col lg:flex-row items-center justify-between gap-12 h-full py-8">
              
              {/* SOURCE CARD */}
              <div className="flex-1 w-full h-full flex flex-col">
                {source ? renderSelectedCard(source, 'source') : renderEmptyCard('source')}
              </div>

              {/* CENTER CONTROLS */}
              <div className="shrink-0 flex flex-col items-center justify-center w-full lg:w-48 z-10 space-y-6">
                 {/* Directional Flow */}
                 <div className="relative w-full flex items-center justify-center h-12">
                   <div className="absolute inset-0 flex items-center">
                     <div className="w-full border-t-2 border-dashed border-slate-200"></div>
                   </div>
                   <div className="relative bg-white p-2 rounded-full border border-slate-100 shadow-sm z-10">
                     {isTwoWay ? (
                        <RefreshCw className="w-8 h-8 text-primary-500 animate-[spin_4s_linear_infinite]" />
                     ) : (
                        <ArrowRight className="w-8 h-8 text-primary-500" />
                     )}
                   </div>
                 </div>

                 <button 
                   onClick={() => setIsTwoWay(!isTwoWay)}
                   className="text-xs font-medium text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors border border-primary-100"
                 >
                   {isTwoWay ? 'Two-way Sync' : 'One-way Sync'}
                 </button>
              </div>

              {/* DESTINATION CARD */}
              <div className="flex-1 w-full h-full flex flex-col">
                {destination ? renderSelectedCard(destination, 'destination') : renderEmptyCard('destination')}
              </div>

           </div>

           {/* Footer Options */}
           <div className="border-t border-slate-100 pt-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-6">
              
              <div className="flex items-center gap-6">
                 <button className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors font-medium text-sm">
                    <Settings className="w-4 h-4" />
                    Options
                 </button>
                 <div className="h-4 w-px bg-slate-200"></div>
                 <div className="flex items-center gap-2 text-slate-500 hover:text-primary-600 transition-colors cursor-text group">
                    <Edit3 className="w-4 h-4 group-hover:text-primary-500" />
                    <input 
                      value={taskName}
                      onChange={(e) => setTaskName(e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-300 focus:border-primary-500 focus:outline-none w-32 font-medium text-sm text-slate-700"
                    />
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <button 
                  onClick={handleSyncNow}
                  disabled={!source || !destination || isSyncing}
                  className={`flex items-center justify-center gap-2 px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary-500/20 transition-all transform active:scale-95 w-[150px]
                    ${source && destination 
                      ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                 >
                    {isSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Sync Now
                      </>
                    )}
                 </button>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default App;
