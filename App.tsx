import React, { useState, useEffect } from 'react';
import { Settings, Edit3, Cloud, RefreshCw, Play, ArrowRight, Zap, Info, Loader2, Database, Trash2, Folder } from 'lucide-react';
import { CloudProvider, SyncTask, SyncMode, ProviderType } from './types';
import { CloudSelectorModal } from './components/CloudSelectorModal';
import { analyzeSyncTask } from './services/geminiService';
import { initializeGoogleApi, handleAuthClick, setClientId as setServiceClientId } from './services/googleDriveService';

const App: React.FC = () => {
  // State
  const [taskName, setTaskName] = useState('Task 1');
  const [syncMode, setSyncMode] = useState<SyncMode>('realtime');
  
  // These hold the FULL provider object, including the specific selected folder
  const [source, setSource] = useState<CloudProvider | null>(null);
  const [destination, setDestination] = useState<CloudProvider | null>(null);
  
  const [isTwoWay, setIsTwoWay] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ suggestion: string; tips: string[] } | null>(null);
  const [googleClientId, setGoogleClientId] = useState('320099579191-ahhkojashkfi035i99j5rpcdrofjltoj.apps.googleusercontent.com');

  // Store authenticated drives
  const [connectedDrives, setConnectedDrives] = useState<CloudProvider[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSelectionSide, setActiveSelectionSide] = useState<'source' | 'destination'>('source');

  // Initialize Google API on mount
  useEffect(() => {
    initializeGoogleApi(() => {
      console.log("Google API initialized");
    });
    
    if (googleClientId) {
      setServiceClientId(googleClientId);
    }
  }, [googleClientId]);

  // Handlers
  const openSelector = (side: 'source' | 'destination') => {
    setActiveSelectionSide(side);
    setModalOpen(true);
  };

  const handleSelectCloud = (provider: CloudProvider) => {
    if (activeSelectionSide === 'source') {
      setSource(provider);
      setAnalysis(null);
    } else {
      setDestination(provider);
      setAnalysis(null);
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

  // AI Analysis Effect
  useEffect(() => {
    const runAnalysis = async () => {
      if (source && destination) {
        setIsAnalyzing(true);
        const result = await analyzeSyncTask(source, destination, isTwoWay);
        setAnalysis(result);
        setIsAnalyzing(false);
      }
    };

    runAnalysis();
  }, [source, destination, isTwoWay]);

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
                <div 
                  onClick={() => openSelector('source')}
                  className={`relative flex-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-8 group
                    ${source 
                      ? 'bg-blue-50/30 border-blue-100 hover:border-blue-300' 
                      : 'bg-slate-50/50 border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                    }`}
                >
                  {source ? (
                    <>
                      <div className="absolute top-4 right-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setSource(null); }}
                          className="p-1.5 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center mb-6">
                        <Database className="w-10 h-10 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">{source.name}</h3>
                      <p className="text-slate-500 text-sm mb-4">{source.email}</p>
                      
                      {/* Selected Path Visualization */}
                      <div className="w-full bg-white rounded border border-blue-200 p-3 flex items-center gap-2 text-sm text-slate-600">
                        <Folder className="w-4 h-4 text-blue-500" />
                        <span className="truncate">{source.selectedFolder?.path || 'Root Folder'}</span>
                      </div>
                      
                      <div className="mt-6 flex items-center gap-2 text-xs font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                         SOURCE
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full border-2 border-slate-300 border-dashed flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary-400 group-hover:text-primary-500 text-slate-300 transition-all duration-300">
                        <span className="text-4xl font-light pb-1">+</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-400 group-hover:text-primary-600 transition-colors">FROM</h3>
                      <p className="text-slate-400 mt-3 text-sm text-center max-w-[200px] leading-relaxed">
                        Select Source Drive & Folder
                      </p>
                    </>
                  )}
                </div>
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

                  {/* AI Widget */}
                  {(source && destination) && (
                    <div className="w-64 animate-slide-up">
                      <div className="bg-amber-50/80 border border-amber-100 rounded-lg p-4 shadow-sm backdrop-blur-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Zap className="w-4 h-4 text-amber-500 fill-current" />
                          <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">AI Analysis</span>
                        </div>
                        {isAnalyzing ? (
                          <div className="flex items-center gap-2 text-xs text-amber-700">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Checking compatibility...
                          </div>
                        ) : analysis ? (
                          <div className="text-xs space-y-2">
                            <p className="text-amber-900 font-medium leading-tight">{analysis.suggestion}</p>
                            <div className="h-px bg-amber-200/50 w-full"></div>
                            <p className="text-amber-700">{analysis.tips[0]}</p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
              </div>

              {/* DESTINATION CARD */}
              <div className="flex-1 w-full h-full flex flex-col">
                <div 
                  onClick={() => openSelector('destination')}
                  className={`relative flex-1 rounded-xl border-2 transition-all cursor-pointer flex flex-col items-center justify-center p-8 group
                    ${destination 
                      ? 'bg-purple-50/30 border-purple-100 hover:border-purple-300' 
                      : 'bg-slate-50/50 border-dashed border-slate-300 hover:border-primary-400 hover:bg-slate-50'
                    }`}
                >
                   {destination ? (
                    <>
                      <div className="absolute top-4 right-4">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setDestination(null); }}
                          className="p-1.5 hover:bg-red-50 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="w-20 h-20 bg-white rounded-2xl shadow-sm border border-purple-100 flex items-center justify-center mb-6">
                        <Cloud className="w-10 h-10 text-purple-600" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-1">{destination.name}</h3>
                      <p className="text-slate-500 text-sm mb-4">{destination.email}</p>
                      
                      {/* Selected Path Visualization */}
                      <div className="w-full bg-white rounded border border-purple-200 p-3 flex items-center gap-2 text-sm text-slate-600">
                        <Folder className="w-4 h-4 text-purple-500" />
                        <span className="truncate">{destination.selectedFolder?.path || 'Root Folder'}</span>
                      </div>

                      <div className="mt-6 flex items-center gap-2 text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                         DESTINATION
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full border-2 border-slate-300 border-dashed flex items-center justify-center mb-6 group-hover:scale-110 group-hover:border-primary-400 group-hover:text-primary-500 text-slate-300 transition-all duration-300">
                        <span className="text-4xl font-light pb-1">+</span>
                      </div>
                      <h3 className="text-2xl font-semibold text-slate-400 group-hover:text-primary-600 transition-colors">TO</h3>
                      <p className="text-slate-400 mt-3 text-sm text-center max-w-[200px] leading-relaxed">
                        Select Target Drive & Folder
                      </p>
                    </>
                  )}
                </div>
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
                  disabled={!source || !destination}
                  className={`flex items-center gap-2 px-8 py-3 rounded-lg font-semibold shadow-lg shadow-primary-500/20 transition-all transform active:scale-95
                    ${source && destination 
                      ? 'bg-primary-600 hover:bg-primary-700 text-white cursor-pointer' 
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    }`}
                 >
                    <Play className="w-4 h-4 fill-current" />
                    Sync Now
                 </button>
              </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default App;