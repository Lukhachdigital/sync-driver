import React, { useState } from 'react';
import { CloudProvider, ProviderType } from '../types';
import { FileExplorer } from './FileExplorer';
import { HardDrive, Cloud, Server, Box, Plus, CheckCircle2, ArrowLeft, Loader2, Settings2 } from 'lucide-react';

interface CloudSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (provider: CloudProvider) => void;
  side: 'source' | 'destination';
  connectedDrives: CloudProvider[];
  onAddDrive: (type: ProviderType) => Promise<CloudProvider | null>;
  clientId: string;
}

export const CloudSelectorModal: React.FC<CloudSelectorModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  side, 
  connectedDrives,
  onAddDrive,
  clientId,
}) => {
  const [view, setView] = useState<'list' | 'add' | 'explorer'>('list');
  const [isConnecting, setIsConnecting] = useState(false);
  const [activeDrive, setActiveDrive] = useState<CloudProvider | null>(null);

  if (!isOpen) return null;

  const handleAddClick = () => setView('add');
  const handleBack = () => {
    setView('list');
    setActiveDrive(null);
  };

  const handleConnect = async (type: ProviderType) => {
    if (!clientId) {
        alert("Google Client ID chưa được cấu hình trong ứng dụng.");
        return;
    }
    setIsConnecting(true);
    const newProvider = await onAddDrive(type);
    setIsConnecting(false);
    
    if (newProvider) {
      // Automatically go to explorer for the new drive
      setActiveDrive(newProvider);
      setView('explorer');
    }
  };

  const handleDriveClick = (drive: CloudProvider) => {
    if (!drive.isConnected) {
        // Re-auth logic could go here
        return;
    }
    setActiveDrive(drive);
    setView('explorer');
  };

  const handleFolderSelection = (folder: { id: string, name: string, path: string }) => {
    if (activeDrive) {
        const updatedProvider = { 
            ...activeDrive, 
            selectedFolder: folder 
        };
        onSelect(updatedProvider);
        // Reset state for next time
        setView('list');
        setActiveDrive(null);
    }
  };

  const getIcon = (type: ProviderType) => {
    switch (type) {
      case 'Google Drive': return <HardDrive className="w-8 h-8 text-blue-500" />;
      case 'Dropbox': return <Box className="w-8 h-8 text-indigo-600" />;
      case 'OneDrive': return <Cloud className="w-8 h-8 text-sky-500" />;
      default: return <Server className="w-8 h-8 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-white px-6 py-4 border-b flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {(view === 'add' || view === 'explorer') && (
              <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h3 className="text-lg font-semibold text-gray-800">
              {view === 'add' ? 'Add Cloud Account' : view === 'explorer' ? 'Select Folder' : `Select ${side === 'source' ? 'Source' : 'Target'}`}
            </h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="bg-slate-50 min-h-[400px] flex flex-col">
          
          {view === 'explorer' && activeDrive?.accessToken ? (
             <FileExplorer 
                accessToken={activeDrive.accessToken} 
                onSelectFolder={handleFolderSelection}
                onCancel={handleBack}
             />
          ) : isConnecting ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] space-y-4">
              <Loader2 className="w-12 h-12 text-primary-600 animate-spin" />
              <p className="text-gray-600 font-medium">Connecting to Google Drive...</p>
              <p className="text-sm text-gray-400">Please complete the authorization in the popup window.</p>
            </div>
          ) : view === 'list' ? (
            <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
              {/* Connected Drives List */}
              {connectedDrives.map((drive) => (
                <button
                  key={drive.id}
                  onClick={() => handleDriveClick(drive)}
                  className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl hover:border-primary-500 hover:shadow-md transition-all group relative"
                >
                  <div className="mb-3 p-3 bg-gray-50 rounded-full group-hover:scale-110 transition-transform">
                    {getIcon(drive.type)}
                  </div>
                  <span className="font-medium text-gray-700 text-sm truncate w-full text-center">{drive.name}</span>
                  <span className="text-xs text-gray-400 mt-1">{drive.email || 'Connected'}</span>
                  <div className="mt-2 text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Active</div>
                </button>
              ))}
              
              {/* Add New Button */}
              <button 
                onClick={handleAddClick}
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-primary-400 hover:bg-primary-50/50 text-gray-400 hover:text-primary-600 transition-all h-full min-h-[160px]"
              >
                 <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2 group-hover:bg-primary-100 transition-colors">
                    <Plus className="w-6 h-6" />
                 </div>
                 <span className="text-sm font-medium">Add Cloud</span>
              </button>
            </div>
          ) : (
            /* Add Cloud View */
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto">
               <button onClick={() => handleConnect('Google Drive')} className="flex items-center p-4 bg-white border rounded-lg hover:shadow-md hover:border-primary-500 transition-all text-left group">
                 <div className="p-2 bg-blue-50 rounded-lg mr-4 group-hover:bg-blue-100"><HardDrive className="w-6 h-6 text-blue-600" /></div>
                 <div>
                   <span className="block font-medium text-gray-800">Google Drive</span>
                   <span className="text-xs text-gray-500">Personal & Business</span>
                 </div>
               </button>
               {/* Placeholders for others */}
               <button disabled className="opacity-50 flex items-center p-4 bg-white border rounded-lg text-left group cursor-not-allowed">
                 <div className="p-2 bg-indigo-50 rounded-lg mr-4"><Box className="w-6 h-6 text-indigo-600" /></div>
                 <div>
                   <span className="block font-medium text-gray-800">Dropbox</span>
                   <span className="text-xs text-gray-500">Coming Soon</span>
                 </div>
               </button>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {view === 'list' && (
          <div className="bg-gray-50 px-6 py-3 border-t text-xs text-gray-500 flex justify-between">
             <span>Supported Clouds: Google Drive (Live), Dropbox (Soon)...</span>
          </div>
        )}
      </div>
    </div>
  );
};
