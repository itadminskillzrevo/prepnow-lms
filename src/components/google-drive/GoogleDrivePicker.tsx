import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  useDriveFiles,
  useSearchDriveFiles,
  useCreateDriveFolder,
  useUploadToDrive,
  DriveFile,
} from '@/hooks/useGoogleDrive';
import {
  Folder,
  FileText,
  Image,
  Video,
  Music,
  File,
  ChevronRight,
  ChevronLeft,
  Search,
  Plus,
  Upload,
  Loader2,
  Check,
  X,
  FolderPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface GoogleDrivePickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (files: DriveFile[]) => void;
  multiple?: boolean;
  allowFolders?: boolean;
  title?: string;
}

const getFileIcon = (mimeType: string) => {
  if (mimeType === 'application/vnd.google-apps.folder') return Folder;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Video;
  if (mimeType.startsWith('audio/')) return Music;
  if (mimeType.includes('document') || mimeType.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes?: string) => {
  if (!bytes) return '';
  const size = parseInt(bytes, 10);
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({
  open,
  onClose,
  onSelect,
  multiple = false,
  allowFolders = false,
  title = 'Select from Google Drive',
}) => {
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<DriveFile[] | null>(null);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const currentFolderId = folderStack.length > 0 ? folderStack[folderStack.length - 1].id : undefined;

  const { data: files, isLoading } = useDriveFiles(currentFolderId, open && !searchResults);
  const searchMutation = useSearchDriveFiles();
  const createFolderMutation = useCreateDriveFolder();
  const uploadMutation = useUploadToDrive();

  const displayFiles = searchResults || files || [];

  const handleFolderOpen = (folder: DriveFile) => {
    setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
    setSearchResults(null);
    setSearchQuery('');
  };

  const handleBack = () => {
    setFolderStack(folderStack.slice(0, -1));
    setSearchResults(null);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const results = await searchMutation.mutateAsync({
        query: searchQuery,
        folderId: currentFolderId,
      });
      setSearchResults(results);
    } finally {
      setIsSearching(false);
    }
  };

  const handleFileSelect = (file: DriveFile) => {
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
    
    if (isFolder && !allowFolders) {
      handleFolderOpen(file);
      return;
    }

    if (multiple) {
      const isSelected = selectedFiles.some((f) => f.id === file.id);
      if (isSelected) {
        setSelectedFiles(selectedFiles.filter((f) => f.id !== file.id));
      } else {
        setSelectedFiles([...selectedFiles, file]);
      }
    } else {
      setSelectedFiles([file]);
    }
  };

  const handleConfirm = () => {
    onSelect(selectedFiles);
    handleClose();
  };

  const handleClose = () => {
    setSelectedFiles([]);
    setFolderStack([]);
    setSearchQuery('');
    setSearchResults(null);
    setShowNewFolder(false);
    setNewFolderName('');
    onClose();
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolderMutation.mutateAsync({
      name: newFolderName,
      parentId: currentFolderId,
    });
    setShowNewFolder(false);
    setNewFolderName('');
  };

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        await uploadMutation.mutateAsync({
          name: file.name,
          content: base64,
          mimeType: file.type,
          parentId: currentFolderId,
        });
      };
      reader.readAsDataURL(file);
    },
    [currentFolderId, uploadMutation]
  );

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Browse and select files from Google Drive
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSearch}
              disabled={isSearching}
            >
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowNewFolder(true)}
              disabled={createFolderMutation.isPending}
            >
              <FolderPlus className="h-4 w-4 mr-1" />
              New Folder
            </Button>
            <label>
              <input
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploadMutation.isPending}
              />
              <Button
                variant="outline"
                size="sm"
                asChild
                disabled={uploadMutation.isPending}
              >
                <span>
                  {uploadMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  Upload
                </span>
              </Button>
            </label>
          </div>
        </div>

        {/* New Folder Input */}
        {showNewFolder && (
          <div className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="New folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              className="flex-1 h-8"
              autoFocus
            />
            <Button
              size="sm"
              onClick={handleCreateFolder}
              disabled={createFolderMutation.isPending || !newFolderName.trim()}
            >
              {createFolderMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFolderStack([]);
              setSearchResults(null);
            }}
            className="h-7 px-2"
          >
            My Drive
          </Button>
          {folderStack.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFolderStack(folderStack.slice(0, index + 1));
                  setSearchResults(null);
                }}
                className="h-7 px-2"
              >
                {folder.name}
              </Button>
            </React.Fragment>
          ))}
          {searchResults && (
            <>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary">Search results</Badge>
            </>
          )}
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 min-h-[300px] border rounded-lg">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : displayFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mb-2 opacity-50" />
              <p>No files found</p>
            </div>
          ) : (
            <div className="p-2">
              {folderStack.length > 0 && !searchResults && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-secondary transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                  <span className="font-medium">Back</span>
                </button>
              )}
              {displayFiles.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                const isSelected = selectedFiles.some((f) => f.id === file.id);
                const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

                return (
                  <button
                    key={file.id}
                    onClick={() => handleFileSelect(file)}
                    onDoubleClick={() => isFolder && handleFolderOpen(file)}
                    className={cn(
                      'flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left',
                      isSelected
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-secondary'
                    )}
                  >
                    {file.thumbnailLink ? (
                      <img
                        src={file.thumbnailLink}
                        alt=""
                        className="h-8 w-8 rounded object-cover"
                      />
                    ) : (
                      <Icon
                        className={cn(
                          'h-5 w-5',
                          isFolder ? 'text-yellow-500' : 'text-muted-foreground'
                        )}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      {file.size && (
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(file.size)}
                        </p>
                      )}
                    </div>
                    {isSelected && <Check className="h-5 w-5 text-primary shrink-0" />}
                    {isFolder && !allowFolders && (
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Selected Files & Actions */}
        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedFiles.length > 0 ? (
              <span>{selectedFiles.length} file(s) selected</span>
            ) : (
              <span>No files selected</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={selectedFiles.length === 0}>
              {selectedFiles.length > 0 ? `Select (${selectedFiles.length})` : 'Select'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
