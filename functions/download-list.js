import { readdirSync, statSync, existsSync } from 'fs';
import { join, extname, relative } from 'path';

/**
 * Vercel API Route for listing downloadable files
 * Usage: /api/download-list
 */
export default function handler(req, res) {
  try {
    // 只允许GET请求
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const downloadDir = join(process.cwd(), 'download');
    
    // 检查download目录是否存在
    if (!existsSync(downloadDir)) {
      return res.status(404).json({ error: 'Download directory not found' });
    }

    // 递归获取所有文件
    function getFilesRecursively(dir, baseDir = dir) {
      const files = [];
      const items = readdirSync(dir);

      for (const item of items) {
        const fullPath = join(dir, item);
        const stats = statSync(fullPath);
        
        if (stats.isDirectory()) {
          // 递归处理子目录
          files.push(...getFilesRecursively(fullPath, baseDir));
        } else if (stats.isFile()) {
          // 计算相对路径
          const relativePath = relative(baseDir, fullPath);
          const fileExt = extname(item).toLowerCase();
          
          // 获取文件信息
          files.push({
            name: item,
            path: relativePath.replace(/\\/g, '/'), // 统一使用正斜杠
            size: stats.size,
            sizeFormatted: formatFileSize(stats.size),
            modified: stats.mtime.toISOString(),
            extension: fileExt,
            type: getFileType(fileExt),
            downloadUrl: `/api/download?file=${encodeURIComponent(relativePath.replace(/\\/g, '/'))}`
          });
        }
      }

      return files;
    }

    // 获取文件类型
    function getFileType(ext) {
      const types = {
        '.zip': 'archive',
        '.rar': 'archive',
        '.7z': 'archive',
        '.tar': 'archive',
        '.gz': 'archive',
        '.pdf': 'document',
        '.doc': 'document',
        '.docx': 'document',
        '.txt': 'text',
        '.md': 'text',
        '.json': 'code',
        '.js': 'code',
        '.css': 'code',
        '.html': 'code',
        '.xml': 'code',
        '.png': 'image',
        '.jpg': 'image',
        '.jpeg': 'image',
        '.gif': 'image',
        '.svg': 'image',
        '.webp': 'image',
        '.mp3': 'audio',
        '.wav': 'audio',
        '.flac': 'audio',
        '.mp4': 'video',
        '.avi': 'video',
        '.mkv': 'video',
        '.mov': 'video',
        '.xls': 'spreadsheet',
        '.xlsx': 'spreadsheet',
        '.csv': 'spreadsheet'
      };
      return types[ext] || 'other';
    }

    // 格式化文件大小
    function formatFileSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    const files = getFilesRecursively(downloadDir);
    
    // 按修改时间排序（最新的在前）
    files.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    // 统计信息
    const stats = {
      totalFiles: files.length,
      totalSize: files.reduce((sum, file) => sum + file.size, 0),
      totalSizeFormatted: formatFileSize(files.reduce((sum, file) => sum + file.size, 0)),
      fileTypes: files.reduce((acc, file) => {
        acc[file.type] = (acc[file.type] || 0) + 1;
        return acc;
      }, {})
    };

    res.status(200).json({
      success: true,
      stats,
      files
    });

  } catch (error) {
    console.error('Download list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
