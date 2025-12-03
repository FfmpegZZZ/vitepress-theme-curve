/**
 * 代理下载 Edge Function
 * 用于代理奇游加速器的下载链接，避免被浏览器标记为危险网站
 * 
 * 使用方法: /api/proxy-download?url=<encoded_url>&filename=<filename>
 */

// 允许的域名白名单
const ALLOWED_DOMAINS = [
  'qiyou.cn',
  'static.qiyou.cn',
  'apifast.qiyou.cn',
  'download.qiyou.cn',
  'qijihezi.cn',
  'coolsvcoss.qijihezi.cn'
];

/**
 * 验证 URL 是否在白名单中
 */
function isAllowedUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    return ALLOWED_DOMAINS.some(d => parsed.hostname === d || parsed.hostname.endsWith('.' + d));
  } catch {
    return false;
  }
}

/**
 * 从 URL 中提取文件名
 */
function extractFilename(url, defaultName = 'download') {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const segments = pathname.split('/').filter(Boolean);
    const lastSegment = segments[segments.length - 1];
    if (lastSegment && lastSegment.includes('.')) {
      return lastSegment;
    }
  } catch {}
  return defaultName;
}

export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  
  // 获取参数
  const targetUrl = url.searchParams.get('url');
  const customFilename = url.searchParams.get('filename');
  
  // 验证参数
  if (!targetUrl) {
    return new Response(JSON.stringify({ error: '缺少 url 参数' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 解码 URL
  let decodedUrl;
  try {
    decodedUrl = decodeURIComponent(targetUrl);
  } catch {
    return new Response(JSON.stringify({ error: 'URL 解码失败' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // 验证 URL 是否在白名单中
  if (!isAllowedUrl(decodedUrl)) {
    return new Response(JSON.stringify({ error: '不允许的下载域名' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 发起代理请求
    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.qiyou.cn/'
      }
    });
    
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `上游请求失败: ${response.status}` }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 获取文件名
    const filename = customFilename || extractFilename(decodedUrl, 'qiyou-app');
    
    // 获取内容类型
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    const contentLength = response.headers.get('Content-Length');
    
    // 构建响应头
    const responseHeaders = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*'
    });
    
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    
    // 返回流式响应
    return new Response(response.body, {
      status: 200,
      headers: responseHeaders
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ error: `代理请求错误: ${error.message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理 OPTIONS 请求 (CORS 预检)
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400'
    }
  });
}
