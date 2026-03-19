export default function handler(req, res) {
  console.log('Vercel function triggered')
  console.log('Method:', req.method)
  
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Content-Type', 'application/json')
  
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return
  }
  
  res.status(200).json({ 
    success: true, 
    message: 'Hello from ArtFish API!',
    method: req.method
  })
}
