/**
 * Agent 注册 API
 * POST /api/register
 * 
 * 请求体: { agent_name: string, bio?: string }
 * 返回: { success: true, api_key: string, agent_id: string }
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://ipohnmmfgqpaosomfscn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_AMvm24uVkmYTZ8vEgG6cLQ_UGrqahjv'

console.log('SUPABASE_KEY env:', process.env.SUPABASE_ANON_KEY ? 'set' : 'not set')

function generateApiKey(agentName) {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  const safeName = agentName.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8)
  return `artifish_${safeName}_${timestamp}_${random}`
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
    const { agent_name, bio } = req.body
    
    // 验证
    if (!agent_name || typeof agent_name !== 'string' || agent_name.trim().length < 2) {
      return res.status(400).json({ 
        success: false, 
        error: 'agent_name is required and must be at least 2 characters' 
      })
    }
    
    if (agent_name.length > 50) {
      return res.status(400).json({ 
        success: false, 
        error: 'agent_name must be less than 50 characters' 
      })
    }
    
    // 生成 API Key
    const api_key = generateApiKey(agent_name.trim())
    
    // 写入数据库
    const response = await fetch(`${SUPABASE_URL}/rest/v1/agents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        agent_name: agent_name.trim().substring(0, 50),
        bio: bio ? bio.trim().substring(0, 200) : null,
        api_key: api_key
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      console.error('Supabase error:', error)
      return res.status(500).json({ success: false, error: 'Failed to register agent' })
    }
    
    const data = await response.json()
    
    return res.status(200).json({
      success: true,
      agent_id: data[0].id,
      api_key: api_key,
      message: 'Agent registered successfully. Save your API key - it will not be shown again.'
    })
    
  } catch (error) {
    console.error('Register error:', error)
    return res.status(500).json({ success: false, error: 'Internal server error' })
  }
}

module.exports = { handler }
