import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'api-generate',
        configureServer(server) {
          server.middlewares.use('/api/generate', async (req, res) => {
            if (req.method !== 'POST') {
              res.statusCode = 405
              res.end('Method Not Allowed')
              return
            }

            const apiKey = env.ANTHROPIC_API_KEY
            if (!apiKey || apiKey === 'your-api-key-here') {
              res.statusCode = 500
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: 'ANTHROPIC_API_KEY is not configured. Add it to the .env file.' } }))
              return
            }

            // Read request body
            const chunks: Buffer[] = []
            for await (const chunk of req) {
              chunks.push(chunk as Buffer)
            }
            const body = Buffer.concat(chunks).toString()

            // Forward to Anthropic with the server-side API key
            let anthropicResponse: Response
            try {
              anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': apiKey,
                  'anthropic-version': '2023-06-01',
                },
                body,
              })
            } catch (err) {
              console.error('[vite/api] Anthropic fetch error:', err)
              res.statusCode = 502
              res.setHeader('Content-Type', 'application/json')
              res.end(JSON.stringify({ error: { message: 'Failed to reach Anthropic API' } }))
              return
            }

            res.statusCode = anthropicResponse.status
            // Forward content-type so SSE streaming works
            const ct = anthropicResponse.headers.get('content-type')
            if (ct) res.setHeader('Content-Type', ct)

            if (anthropicResponse.body) {
              const reader = anthropicResponse.body.getReader()
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                res.write(value)
              }
            }
            res.end()
          })
        },
      },
    ],
    server: {
      allowedHosts: true,
    },
  }
})
