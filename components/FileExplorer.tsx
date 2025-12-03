import React, { useEffect, useState } from 'react';
import { DriveFile } from '../types';
import { listFiles } from '../services/googleDriveService';
import { Folder, File, ArrowLeft, Loader2, HardDrive, Check } from 'lucide-react';

interface FileExplorerProps {
  accessToken: string;
  onSelectFolder: (folder: { id: string; name: string; path: string }) => void;
  onCancel: () => void;
}

export const FileExplorer: React.FC<FileExplorerProps> = ({ accessToken, onSelectFolder, onCancel }) => {
  const [currentPath, setCurrentPath] = useState<{id: string, name: string}[]>([{ id: 'root', name: 'My Drive' }]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  const currentFolder = currentPath[currentPath.length - 1];

  useEffect(() => {
    loadFiles(currentFolder.id);
  }, [currentFolder.id]);

  const loadFiles = async (folderId: string) => {
    setLoading(true);
    try {
      const result = await listFiles(folderId);
      setFiles(result);
    } catch (error) {
      console.error("Failed to load files", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDoubleClick = (file: DriveFile) => {
    if (file.mimeType === 'application/vnd.google-apps.folder') {
      setCurrentPath([...currentPath, { id: file.id, name: file.name }]);
      setSelectedFileId(null);
    }
  };

  const handleGoBack = () => {
    if (currentPath.length > 1) {
      const newPath = [...currentPath];
      newPath.pop();
      setCurrentPath(newPath);
      setSelectedFileId(null);
    }
  };

  const handleConfirm = () => {
    // We select the CURRENT folder being viewed
    const pathString = currentPath.map(p => p.name).join(' > ');
    onSelectFolder({
      id: currentFolder.id,
      name: currentFolder.name,
      path: pathString
    });
  };

  return (
    <div className="flex flex-col h-[500px]">
      {/* Explorer Header */}
      <div className="flex items-center gap-2 p-4 border-b bg-gray-50">
        <button 
          onClick={handleGoBack} 
          disabled={currentPath.length === 1}
          className="p-2 hover:bg-gray-200 rounded-full disabled:opacity-30 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex-1 font-medium text-gray-700 truncate flex items-center gap-2">
           <HardDrive className="w-4 h-4 text-gray-400" />
           {currentPath.map(p => p.name).join(' / ')}
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin mb-2" />
            <p>Loading files...</p>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
             <Folder className="w-12 h-12 mb-2 opacity-20" />
             <p>This folder is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {files.map((file) => (
              <div 
                key={file.id}
                onDoubleClick={() => handleDoubleClick(file)}
                onClick={() => setSelectedFileId(file.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border border-transparent
                  ${selectedFileId === file.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'}
                `}
              >
                {file.mimeType === 'application/vnd.google-apps.folder' ? (
                  <Folder className={`w-6 h-6 ${selectedFileId === file.id ? 'text-blue-500 fill-blue-100' : 'text-gray-400 fill-gray-50'}`} />
                ) : (
                  <File className="w-6 h-6 text-gray-400" />
                )}
                <span className={`text-sm truncate flex-1 ${selectedFileId === file.id ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                  {file.name}
                </span>
                {file.mimeType === 'application/vnd.google-apps.folder' && (
                   <span className="text-xs text-gray-400 px-2 py-1 bg-gray-100 rounded">Folder</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Action */}
      <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
        >
          Cancel
        </button>
        <button 
          onClick={handleConfirm}
          className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4" />
          Select this Folder
        </button>
      </div>
    </div>
  );
};
