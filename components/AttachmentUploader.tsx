import { useState, useRef } from 'react';
import { Upload, X, File, Image, FileText } from 'lucide-react';
import { app } from '../lib/cloudbase';
import type { IssueAttachment } from '../types/issue';

interface AttachmentUploaderProps {
  attachments: IssueAttachment[];
  onChange: (attachments: IssueAttachment[]) => void;
  maxFiles?: number; // 最大文件数量
  maxSize?: number; // 单个文件最大大小(MB)
}

export default function AttachmentUploader({ 
  attachments, 
  onChange,
  maxFiles = 10,
  maxSize = 50 
}: AttachmentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 获取文件图标
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="w-5 h-5" />;
    }
    if (fileType.includes('pdf') || fileType.includes('document')) {
      return <FileText className="w-5 h-5" />;
    }
    return <File className="w-5 h-5" />;
  };

  // 格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 检查文件数量限制
    if (attachments.length + files.length > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 个文件`);
      return;
    }

    // 检查文件大小
    const maxBytes = maxSize * 1024 * 1024;
    const oversizedFiles = files.filter(f => f.size > maxBytes);
    if (oversizedFiles.length > 0) {
      alert(`文件 "${oversizedFiles[0].name}" 超过 ${maxSize}MB 限制`);
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (file) => {
        // 读取文件为 base64
        const reader = new FileReader();
        const fileContent = await new Promise<string>((resolve) => {
          reader.onload = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // 移除 data:xxx;base64, 前缀
          };
          reader.readAsDataURL(file);
        });

        // 通过云函数上传(绕过CORS限制)
        const result = await app.callFunction({
          name: 'uploadAttachment',
          data: {
            fileContent,
            fileName: file.name,
            fileType: file.type
          }
        });

        console.log('上传成功:', result);

        if (!result.result?.success) {
          throw new Error(result.result?.error || '上传失败');
        }

        const data = result.result.data;
        const attachment: IssueAttachment = {
          fileID: data.fileID,
          fileName: data.name,
          fileSize: data.size,
          fileType: data.type,
          uploadedAt: new Date().toISOString(),
          tempUrl: data.url
        };

        return attachment;
      });

      const newAttachments = await Promise.all(uploadPromises);
      onChange([...attachments, ...newAttachments]);

      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('上传失败:', error);
      alert('文件上传失败: ' + (error.message || '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  // 删除附件
  const handleRemove = async (index: number) => {
    const attachment = attachments[index];
    
    try {
      // 从云存储删除文件
      await app.deleteFile({
        fileList: [attachment.fileID]
      });

      // 从列表中移除
      const newAttachments = attachments.filter((_, i) => i !== index);
      onChange(newAttachments);
    } catch (error: any) {
      console.error('删除失败:', error);
      alert('删除文件失败: ' + (error.message || '未知错误'));
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        附件 ({attachments.length}/{maxFiles})
      </label>

      {/* 上传按钮 */}
      <div className="mb-3">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          disabled={uploading || attachments.length >= maxFiles}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || attachments.length >= maxFiles}
          className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              上传中...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              选择文件
            </>
          )}
        </button>
        <p className="mt-1 text-xs text-gray-500">
          支持上传图片、文档等文件，单个文件不超过 {maxSize}MB
        </p>
      </div>

      {/* 附件列表 */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg group hover:bg-gray-100 transition-colors"
            >
              {/* 文件图标 */}
              <div className="flex-shrink-0 text-gray-600">
                {getFileIcon(attachment.fileType)}
              </div>

              {/* 文件信息 */}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {attachment.fileName}
                </div>
                <div className="text-xs text-gray-500">
                  {formatFileSize(attachment.fileSize)}
                </div>
              </div>

              {/* 删除按钮 */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
