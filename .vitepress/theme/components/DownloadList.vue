<template>
  <div class="download-list">
    <div v-if="loading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载文件列表中...</p>
    </div>
    
    <div v-else-if="error" class="error">
      <p>❌ {{ error }}</p>
      <button @click="fetchFiles" class="retry-btn">重试</button>
    </div>
    
    <div v-else class="download-content">
      <!-- 统计信息 -->
      <div class="stats" v-if="stats">
        <div class="stat-item">
          <span class="stat-label">文件总数:</span>
          <span class="stat-value">{{ stats.totalFiles }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总大小:</span>
          <span class="stat-value">{{ stats.totalSizeFormatted }}</span>
        </div>
      </div>

      <!-- 文件类型过滤 -->
      <div class="filters" v-if="fileTypes.length > 1">
        <button 
          v-for="type in fileTypes" 
          :key="type"
          @click="selectedType = type"
          :class="['filter-btn', { active: selectedType === type }]"
        >
          {{ getTypeLabel(type) }}
        </button>
      </div>

      <!-- 文件列表 -->
      <div class="file-list">
        <div 
          v-for="file in filteredFiles" 
          :key="file.path"
          class="file-item"
        >
          <div class="file-icon">
            {{ getFileIcon(file.type) }}
          </div>
          <div class="file-info">
            <h3 class="file-name">{{ file.name }}</h3>
            <p class="file-details">
              <span class="file-size">{{ file.sizeFormatted }}</span>
              <span class="file-date">{{ formatDate(file.modified) }}</span>
            </p>
            <p class="file-path">{{ file.path }}</p>
          </div>
          <div class="file-actions">
            <a 
              :href="file.downloadUrl" 
              class="download-btn"
              :download="file.name"
              @click="trackDownload(file)"
            >
              📥 下载
            </a>
          </div>
        </div>
      </div>

      <div v-if="filteredFiles.length === 0" class="no-files">
        <p>没有找到{{ selectedType === 'all' ? '' : getTypeLabel(selectedType) }}文件</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

const loading = ref(true)
const error = ref('')
const files = ref([])
const stats = ref(null)
const selectedType = ref('all')

const fileTypes = computed(() => {
  const types = ['all', ...new Set(files.value.map(f => f.type))]
  return types
})

const filteredFiles = computed(() => {
  if (selectedType.value === 'all') {
    return files.value
  }
  return files.value.filter(f => f.type === selectedType.value)
})

const fetchFiles = async () => {
  loading.value = true
  error.value = ''
  
  try {
    const response = await fetch('/api/download-list')
    const data = await response.json()
    
    if (data.success) {
      files.value = data.files
      stats.value = data.stats
    } else {
      error.value = data.error || '获取文件列表失败'
    }
  } catch (err) {
    error.value = '网络错误，请检查连接'
    console.error('Fetch files error:', err)
  } finally {
    loading.value = false
  }
}

const getFileIcon = (type) => {
  const icons = {
    archive: '📦',
    document: '📄',
    text: '📝',
    code: '💻',
    image: '🖼️',
    audio: '🎵',
    video: '🎬',
    spreadsheet: '📊',
    other: '📁'
  }
  return icons[type] || icons.other
}

const getTypeLabel = (type) => {
  const labels = {
    all: '全部',
    archive: '压缩包',
    document: '文档',
    text: '文本',
    code: '代码',
    image: '图片',
    audio: '音频',
    video: '视频',
    spreadsheet: '表格',
    other: '其他'
  }
  return labels[type] || type
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const trackDownload = (file) => {
  console.log('下载文件:', file.name)
  // 这里可以添加下载统计逻辑
}

onMounted(() => {
  fetchFiles()
})
</script>

<style scoped>
.download-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 40px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #3498db;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error {
  text-align: center;
  padding: 40px;
  color: #e74c3c;
}

.retry-btn {
  background: #3498db;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  margin-top: 10px;
}

.retry-btn:hover {
  background: #2980b9;
}

.stats {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 18px;
  font-weight: bold;
  color: #333;
}

.filters {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.filter-btn:hover {
  background: #f0f0f0;
}

.filter-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background: white;
  transition: all 0.3s;
}

.file-item:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  border-color: #3498db;
}

.file-icon {
  font-size: 24px;
  margin-right: 15px;
  min-width: 40px;
  text-align: center;
}

.file-info {
  flex: 1;
}

.file-name {
  margin: 0 0 5px 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.file-details {
  margin: 0 0 5px 0;
  font-size: 14px;
  color: #666;
}

.file-size {
  margin-right: 15px;
}

.file-path {
  margin: 0;
  font-size: 12px;
  color: #999;
  font-family: monospace;
}

.download-btn {
  background: #27ae60;
  color: white;
  text-decoration: none;
  padding: 10px 20px;
  border-radius: 5px;
  transition: all 0.3s;
  font-size: 14px;
}

.download-btn:hover {
  background: #219a52;
  text-decoration: none;
}

.no-files {
  text-align: center;
  padding: 40px;
  color: #666;
}

@media (max-width: 600px) {
  .file-item {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .file-icon {
    margin-bottom: 10px;
  }
  
  .file-actions {
    width: 100%;
    margin-top: 10px;
  }
  
  .download-btn {
    width: 100%;
    text-align: center;
  }
  
  .stats {
    flex-direction: column;
    gap: 10px;
  }
}
</style>
