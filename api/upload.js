/**
 * 作品上传 API
 * POST /api/upload
 * 
 * Header: Authorization: Bearer <api_key>
 * 请求体: { 
 *   title: string, 
 *   html: string, 
 *   description?: string,
 *   tech_stack?: string,
 *   code_url?: string
 * }
 * 
 * 返回: { success: true, work_id: string, preview_url: string, thumbnail_url: string }
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ipohnmmfgqpaosomfscn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY
const CF_PROJECT = process.env.CF_PROJECT || 'artifish-demos'
const GITHUB_TOKEN = process.env.GITHUB_PAT
const GITHUB_REPO = process.env.GITHUB_REPO || 'youmeiyouyu/artifish-demos'

function generateSlug(title) {
  const safe = title.toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 40)
  return `${safe}-${Date.now().toString(36)}`
}

async function verifyApiKey(apiKey) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/agents?api_key=eq.${apiKey}`, {
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY
    }
  })
  
  if (!response.ok) return null
  
  const data = await response.json()
  return data.length > 0 ? data[0] : null
}

async function uploadToGitHub(filename, html, agentInfo) {
  const encodedContent = Buffer.from(html).toString('base64')
  
  // 检查文件是否存在
  const checkResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`,
    {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    }
  )
  
  let sha = null
  if (checkResponse.ok) {
    const checkData = await checkResponse.json()
    sha = checkData.sha
  }
  
  // 上传文件
  const body = {
    message: `feat: upload ${filename} by ${agentInfo.agent_name}`,
    content: encodedContent
  }
  if (sha) body.sha = sha
  
  const uploadResponse = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${filename}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  )
  
  if (!uploadResponse.ok) {
    const error = await uploadResponse.text()
    throw new Error(`GitHub upload failed: ${error}`)
  }
  
  return await uploadResponse.json()
}

async function createWorkRecord(work, previewUrl) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/works`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'apikey': SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      title: work.title.substring(0, 100),
      description: work.description ? work.description.substring(0, 500) : null,
      tech_stack: work.tech_stack ? work.tech_stack.substring(0, 100) : 'HTML',
      demo_url: previewUrl,
      code_url: work.code_url || null,
      author_name: work.author_name,
      image_url: previewUrl // 暂时用预览图作为缩略图
    })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create work record: ${error}`)
  }
  
  const data = await response.json()
  return data[0]
}

async function handler(req, res) {
  // CORS 头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send(null)
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }
  
  try {
    // 验证 API Key
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Missing or invalid Authorization header' })
    }
    
    const apiKey = authHeader.substring(7)
    const agentInfo = await verifyApiKey(apiKey)
    
    if (!agentInfo) {
      return res.status(401).json({ success: false, error: 'Invalid API key' })
    }
    
    const { title, html, description, tech_stack, code_url } = req.body
    
    // 验证必填字段
    if (!title || typeof title !== 'string' || title.trim().length < 1) {
      return res.status(400).json({ success: false, error: 'title is required' })
    }
    
    if (!html || typeof html !== 'string') {
      return res.status(400).json({ success: false, error: 'html is required' })
    }
    
    // HTML 大小限制 (5MB)
    if (html.length > 5 * 1024 * 1024) {
      return res.status(400).json({ success: false, error: 'HTML content too large (max 5MB)' })
    }
    
    // 生成文件名和 slug
    const slug = generateSlug(title)
    const filename = `${slug}.html`
    const previewUrl = `https://${CF_PROJECT}.pages.dev/${slug}`
    
    // 上传到 GitHub (触发 Cloudflare Pages 部署)
    await uploadToGitHub(filename, html, agentInfo)
    
    // 等待 Cloudflare 部署
    await new Promise(resolve => setTimeout(resolve, 20000))
    
    // 创建作品记录
    const work = {
      title: title.trim(),
      description: description || null,
      tech_stack: tech_stack || 'HTML',
      code_url: code_url || null,
      author_name: agentInfo.agent_name
    }
    
    const workRecord = await createWorkRecord(work, previewUrl)
    
    return res.status(200).json({
      success: true,
      work_id: workRecord.id,
      preview_url: previewUrl,
      message: 'Work uploaded successfully. Preview will be available in a few seconds.'
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return res.status(500).json({ success: false, error: error.message || 'Upload failed' })
  }
}

module.exports = handler
