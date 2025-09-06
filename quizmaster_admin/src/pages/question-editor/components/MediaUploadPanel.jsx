import React, { useState, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const MediaUploadPanel = ({ onMediaUpload, existingMedia = [], className = '' }) => {
  const [uploadProgress, setUploadProgress] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const supportedTypes = {
    image: {
      accept: 'image/*',
      maxSize: 5 * 1024 * 1024, // 5MB
      icon: 'Image',
      label: 'Images',
      formats: 'JPG, PNG, GIF, WebP'
    },
    audio: {
      accept: 'audio/*',
      maxSize: 10 * 1024 * 1024, // 10MB
      icon: 'Volume2',
      label: 'Audio',
      formats: 'MP3, WAV, OGG'
    },
    video: {
      accept: 'video/*',
      maxSize: 50 * 1024 * 1024, // 50MB
      icon: 'Video',
      label: 'Video',
      formats: 'MP4, WebM, MOV'
    }
  };

  const handleFileSelect = (files, type) => {
    Array.from(files)?.forEach(file => {
      if (file?.size > supportedTypes?.[type]?.maxSize) {
        alert(`File size exceeds ${supportedTypes?.[type]?.maxSize / (1024 * 1024)}MB limit`);
        return;
      }

      const fileId = `${Date.now()}-${file?.name}`;
      
      // Simulate upload progress
      setUploadProgress(prev => ({ ...prev, [fileId]: 0 }));
      
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          const currentProgress = prev?.[fileId] || 0;
          if (currentProgress >= 100) {
            clearInterval(interval);
            // Simulate successful upload
            const mockUrl = URL.createObjectURL(file);
            onMediaUpload({
              id: fileId,
              type,
              name: file?.name,
              url: mockUrl,
              size: file?.size
            });
            return { ...prev, [fileId]: 100 };
          }
          return { ...prev, [fileId]: currentProgress + 10 };
        });
      }, 200);
    });
  };

  const handleDrop = (e, type) => {
    e?.preventDefault();
    setDragOver(false);
    const files = e?.dataTransfer?.files;
    handleFileSelect(files, type);
  };

  const handleDragOver = (e) => {
    e?.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e?.preventDefault();
    setDragOver(false);
  };

  const removeMedia = (mediaId) => {
    onMediaUpload({ id: mediaId, action: 'remove' });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i))?.toFixed(2)) + ' ' + sizes?.[i];
  };

  const getMediaPreview = (media) => {
    switch (media?.type) {
      case 'image':
        return (
          <Image
            src={media?.url}
            alt={media?.name}
            className="w-full h-20 object-cover rounded"
          />
        );
      case 'audio':
        return (
          <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
            <Icon name="Volume2" size={24} className="text-muted-foreground" />
          </div>
        );
      case 'video':
        return (
          <video
            src={media?.url}
            className="w-full h-20 object-cover rounded"
           
            muted
          />
        );
      default:
        return (
          <div className="w-full h-20 bg-muted rounded flex items-center justify-center">
            <Icon name="File" size={24} className="text-muted-foreground" />
          </div>
        );
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2">
        <Icon name="Paperclip" size={20} className="text-primary" />
        <h3 className="text-lg font-semibold text-text-primary">Media Attachments</h3>
      </div>
      {/* Upload Areas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(supportedTypes)?.map(([type, config]) => (
          <div
            key={type}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-smooth ${
              dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
            }`}
            onDrop={(e) => handleDrop(e, type)}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={config?.accept}
              multiple
              className="hidden"
              onChange={(e) => handleFileSelect(e?.target?.files, type)}
            />
            
            <div className="space-y-3">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
                <Icon name={config?.icon} size={24} className="text-primary" />
              </div>
              
              <div>
                <h4 className="font-medium text-text-primary">{config?.label}</h4>
                <p className="text-xs text-muted-foreground mt-1">{config?.formats}</p>
                <p className="text-xs text-muted-foreground">
                  Max {Math.floor(config?.maxSize / (1024 * 1024))}MB
                </p>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                iconName="Upload"
                iconPosition="left"
                iconSize={16}
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = config?.accept;
                  input.multiple = true;
                  input.onchange = (e) => handleFileSelect(e?.target?.files, type);
                  input?.click();
                }}
              >
                Upload {config?.label}
              </Button>
            </div>
          </div>
        ))}
      </div>
      {/* Uploaded Media */}
      {existingMedia?.length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-text-primary">Uploaded Media</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {existingMedia?.map((media) => (
              <div key={media?.id} className="border border-border rounded-lg p-3 bg-card">
                <div className="space-y-3">
                  {getMediaPreview(media)}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {media?.name}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        iconName="X"
                        iconSize={14}
                        onClick={() => removeMedia(media?.id)}
                        className="p-1 text-error hover:text-error"
                      />
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="capitalize">{media?.type}</span>
                      <span>{formatFileSize(media?.size)}</span>
                    </div>
                    
                    {uploadProgress?.[media?.id] !== undefined && uploadProgress?.[media?.id] < 100 && (
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress?.[media?.id]}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Upload Progress */}
      {Object.keys(uploadProgress)?.some(key => uploadProgress?.[key] < 100) && (
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Upload" size={16} className="text-primary" />
            <span className="text-sm font-medium text-text-primary">Uploading files...</span>
          </div>
          {Object.entries(uploadProgress)?.map(([fileId, progress]) => (
            progress < 100 && (
              <div key={fileId} className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>File {fileId?.split('-')?.[1]}</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-border rounded-full h-1">
                  <div
                    className="bg-primary h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaUploadPanel;