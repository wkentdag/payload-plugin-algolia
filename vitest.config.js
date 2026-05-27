import path from 'path'
import { loadEnv } from 'payload/node'
import { fileURLToPath } from 'url'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// Load before test files import payload.config / int.spec (defineConfig callback can run too late).
loadEnv(path.resolve(dirname, './dev'))

export default defineConfig({
  plugins: [
    tsconfigPaths({
      ignoreConfigErrors: true,
    }),
  ],
  test: {
    environment: 'node',
    hookTimeout: 30_000,
    testTimeout: 30_000,
  },
})
