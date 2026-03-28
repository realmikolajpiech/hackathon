// Local dev proxy — mirrors what Vercel's api/gemini.ts does in production
import 'dotenv/config'
import http from 'http'

const API_KEY = process.env.GEMINI_API_KEY
if (!API_KEY) { console.error('Missing GEMINI_API_KEY in .env'); process.exit(1) }

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/gemini') {
    let body = ''
    req.on('data', (chunk) => body += chunk)
    req.on('end', async () => {
      try {
        const { model, body: geminiBody } = JSON.parse(body)
        const upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(geminiBody) }
        )
        const data = await upstream.json()
        res.writeHead(upstream.status, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(data))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: String(e) }))
      }
    })
  } else {
    res.writeHead(404)
    res.end()
  }
})

server.listen(3001, () => console.log('Dev proxy on :3001'))
