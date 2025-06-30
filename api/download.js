import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { createReadStream } from 'fs';

/**
 * Vercel API Route for downloading files from /download directory
 * Usage: /api/download?file=0605/worker.zip
 */
export default function handler(req, res) {
  try {
    // 只允许GET请求
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 获取文件路径参数
    const { file } = req.query;
    
    if (!file) {
      return res.status(400).json({ error: 'File parameter is required' });
    }

    // 安全检查：防止路径遍历攻击
    if (file.includes('..') || file.includes('\\') || file.startsWith('/')) {
      return res.status(400).json({ error: 'Invalid file path' });
    }

    // 构建完整的文件路径
    const filePath = join(process.cwd(), 'download', file);
    
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // 检查是否为文件（不是目录）
    const stats = statSync(filePath);
    if (!stats.isFile()) {
      return res.status(400).json({ error: 'Path is not a file' });
    }

    // 获取文件信息
    const fileName = basename(filePath);
    const fileExt = extname(filePath).toLowerCase();
    const fileSize = stats.size;

    // 设置MIME类型
    const mimeTypes = {
      '.zip': 'application/zip',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.html': 'text/html',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.mp3': 'audio/mpeg',
      '.mp4': 'video/mp4',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const contentType = mimeTypes[fileExt] || 'application/octet-stream';

    // 设置响应头
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', fileSize);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.setHeader('Cache-Control', 'public, max-age=3600'); // 缓存1小时
    
    // 支持断点续传
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', chunksize);
      
      const stream = createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      // 直接发送整个文件
      const fileBuffer = readFileSync(filePath);
      res.send(fileBuffer);
    }

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
