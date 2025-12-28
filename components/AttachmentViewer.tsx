import { useState } from 'react';
import { File, Image, FileText, ExternalLink } from 'lucide-react';
import { app } from '../lib/cloudbase';
import type { IssueAttachment } from '../types/issue';

interface AttachmentViewerProps {
  attachments: IssueAttachment[];
}

export default function AttachmentViewer({ attachments }: AttachmentViewerProps) {
  const [loadingFileId, setLoadingFileId] = useState<string | null>(null);

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

  // 获取临时访问链接并在浏览器中打开
  const handleOpenFile = async (attachment: IssueAttachment) => {
    try {
      setLoadingFileId(attachment.fileID);

      // 获取临时访问链接(有效期2小时)
      const result = await app.getTempFileURL({
        fileList: [attachment.fileID]
      });

      if (result.fileList && result.fileList.length > 0) {
        let tempUrl = result.fileList[0].tempFileURL;
        
        // 添加 response-content-disposition=inline 参数,让浏览器在线预览而不是下载
        // 对于图片、PDF等浏览器支持的格式,会直接在浏览器中打开
        const url = new URL(tempUrl);
        url.searchParams.set('response-content-disposition', 'inline');
        
        // 在新窗口打开文件
        window.open(url.toString(), '_blank');
      } else {
        alert('无法获取文件链接');
      }
    } catch (error: any) {
      console.error('打开文件失败:', error);
      alert('打开文件失败: ' + (error.message || '未知错误'));
    } finally {
      setLoadingFileId(null);
    }
  };

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="p-6 border-b border-gray-200">
      <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
        <File className="w-4 h-4" />
        附件 ({attachments.length})
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {attachments.map((attachment, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group cursor-pointer"
            onClick={() => handleOpenFile(attachment)}
          >
            {/* 文件图标 */}
            <div className="flex-shrink-0 text-gray-600">
              {getFileIcon(attachment.fileType)}
            </div>

            {/* 文件信息 */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                {attachment.fileName}
              </div>
              <div className="text-xs text-gray-500">
                {formatFileSize(attachment.fileSize)}
              </div>
            </div>

            {/* 打开按钮 */}
            <div className="flex-shrink-0">
              {loadingFileId === attachment.fileID ? (
                <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-orange-600 transition-colors" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
