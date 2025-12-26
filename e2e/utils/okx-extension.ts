import path from 'node:path'
import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import https from 'node:https'
import { unzipArchive } from '@synthetixio/synpress-cache'

const OKX_EXTENSION_ID = 'mcohilncbfahbmgdjkbpemcciiolgcge'
const OKX_CACHE_DIR = path.join(process.cwd(), '.cache-okx')

type PreparedExtension = {
  extensionPath: string
  manifestName: string
}

function download(url: string, destPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume()
        return resolve(download(res.headers.location, destPath))
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`Download failed: ${res.statusCode} ${url}`))
      }
      const file = fs.createWriteStream(destPath)
      res.pipe(file)
      file.on('finish', () => file.close(resolve))
    })
    request.on('error', reject)
  })
}

function convertCrxToZip(crxPath: string, zipPath: string) {
  const buf = fs.readFileSync(crxPath)
  let offset = -1
  for (let i = 0; i < buf.length - 3; i += 1) {
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x03 && buf[i + 3] === 0x04) {
      offset = i
      break
    }
  }
  if (offset === -1) {
    throw new Error('ZIP header not found in CRX')
  }
  fs.writeFileSync(zipPath, buf.slice(offset))
}

async function resolveExtensionRoot(unzipPath: string): Promise<PreparedExtension> {
  const rootManifestPath = path.join(unzipPath, 'manifest.json')
  if (await pathExists(rootManifestPath)) {
    const manifest = await readJson(rootManifestPath)
    return {
      extensionPath: unzipPath,
      manifestName: typeof manifest?.name === 'string' ? manifest.name : 'OKX Wallet'
    }
  }

  const entries = await fsPromises.readdir(unzipPath, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const candidatePath = path.join(unzipPath, entry.name)
    const manifestPath = path.join(candidatePath, 'manifest.json')
    if (await pathExists(manifestPath)) {
      const manifest = await readJson(manifestPath)
      return {
        extensionPath: candidatePath,
        manifestName: typeof manifest?.name === 'string' ? manifest.name : 'OKX Wallet'
      }
    }
  }

  return { extensionPath: unzipPath, manifestName: 'OKX Wallet' }
}

export async function prepareOkxExtension(): Promise<PreparedExtension> {
  await fsPromises.mkdir(OKX_CACHE_DIR, { recursive: true })
  const crxPath = path.join(OKX_CACHE_DIR, 'okx.crx')
  const zipPath = path.join(OKX_CACHE_DIR, 'okx.zip')

  if (!(await pathExists(crxPath))) {
    const updateUrl = `https://clients2.google.com/service/update2/crx?response=redirect&acceptformat=crx2,crx3&prodversion=114.0.0.0&x=id%3D${OKX_EXTENSION_ID}%26uc`
    await download(updateUrl, crxPath)
  }

  if (!(await pathExists(zipPath))) {
    convertCrxToZip(crxPath, zipPath)
  }

  const unzipResult = await unzipArchive({ archivePath: zipPath })
  return resolveExtensionRoot(unzipResult.outputPath)
}

export function getExtensionIdFromUrl(url?: string) {
  if (!url) return undefined
  const match = url.match(/^chrome-extension:\/\/([^/]+)\//)
  return match?.[1]
}

async function pathExists(targetPath: string) {
  try {
    await fsPromises.access(targetPath)
    return true
  } catch {
    return false
  }
}

async function readJson(targetPath: string) {
  const raw = await fsPromises.readFile(targetPath, 'utf-8')
  return JSON.parse(raw)
}
