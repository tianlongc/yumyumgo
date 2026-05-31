import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import type { Plugin } from 'vite'
import path from 'path'

/**
 * Custom Vite plugin that serves the /api/* serverless functions
 * directly during local development. This completely replaces
 * `vercel dev` and avoids the libuv crash on Windows.
 * 
 * In production on Vercel, the /api directory is handled natively
 * as serverless functions — this plugin is dev-only.
 */
function vercelApiPlugin(): Plugin {
  let envVars: Record<string, string> = {}

  return {
    name: 'vite-plugin-vercel-api',
    configureServer(server) {
      // Load .env variables manually so they're available to our handlers
      envVars = loadEnv('development', process.cwd(), '')

      server.middlewares.use(async (req, res, next) => {
        // Only intercept /api/* routes
        if (!req.url?.startsWith('/api/')) {
          return next()
        }

        // Extract the function name from the URL (e.g., /api/places -> places)
        const fnName = req.url.replace('/api/', '').split('?')[0]
        const handlerPath = path.resolve(process.cwd(), 'api', `${fnName}.ts`)

        try {
          // Dynamically import the handler (Vite's ssrLoadModule handles TS)
          const mod = await server.ssrLoadModule(handlerPath)
          const handler = mod.default

          if (typeof handler !== 'function') {
            res.statusCode = 404
            res.end(JSON.stringify({ error: `No handler found for /api/${fnName}` }))
            return
          }

          // Parse JSON body for POST requests
          let body = {}
          if (req.method === 'POST') {
            body = await new Promise<any>((resolve) => {
              let data = ''
              req.on('data', (chunk: Buffer) => { data += chunk.toString() })
              req.on('end', () => {
                try { resolve(JSON.parse(data)) } catch { resolve({}) }
              })
            })
          }

          // Inject env vars into process.env temporarily
          const originalEnv = { ...process.env }
          Object.assign(process.env, envVars)

          // Build a minimal req/res adapter matching Vercel's handler signature
          const fakeReq = {
            method: req.method,
            body,
            query: Object.fromEntries(new URL(req.url!, `http://${req.headers.host}`).searchParams),
            headers: req.headers,
          }

          const fakeRes = {
            statusCode: 200,
            _headers: {} as Record<string, string>,
            status(code: number) {
              this.statusCode = code
              return this
            },
            setHeader(key: string, value: string) {
              this._headers[key] = value
              return this
            },
            json(data: any) {
              res.statusCode = this.statusCode
              res.setHeader('Content-Type', 'application/json')
              for (const [k, v] of Object.entries(this._headers)) {
                res.setHeader(k, v)
              }
              res.end(JSON.stringify(data))
            },
            end(data: any) {
              res.statusCode = this.statusCode
              for (const [k, v] of Object.entries(this._headers)) {
                res.setHeader(k, v)
              }
              res.end(data)
            },
          }

          await handler(fakeReq, fakeRes)

          // Restore original env
          process.env = originalEnv

        } catch (err: any) {
          console.error(`[vite-api] Error in /api/${fnName}:`, err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: err.message || 'Internal server error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), vercelApiPlugin()],
  server: {
    host: '127.0.0.1',
  },
})
