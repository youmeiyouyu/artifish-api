// Simple test endpoint
const handler = async (req, res) => {
  console.log('Handler called')
  console.log('Method:', req.method)
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(204).send('')
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  
  try {
    const body = req.body
    console.log('Body:', body)
    
    return res.status(200).json({ 
      success: true, 
      message: 'API is working!',
      body: body 
    })
  } catch (error) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message })
  }
}

module.exports = handler
