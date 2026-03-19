module.exports = (req, res) => {
  res.json({ 
    success: true, 
    message: 'Hello from ArtFish API!',
    timestamp: Date.now()
  })
}
