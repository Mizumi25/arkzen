import fs from 'fs'
import path from 'path'

// ─────────────────────────────────────────────
// FILE TYPE CATEGORIZATION
// ─────────────────────────────────────────────

const FILE_TYPE_MAP: Record<string, string[]> = {
  images: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.bmp', '.tiff'],
  videos: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.m4v', '.mpg', '.mpeg'],
  audio: ['.mp3', '.wav', '.ogg', '.aac', '.flac', '.m4a', '.wma'],
  documents: ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.csv', '.ppt', '.pptx'],
  fonts: ['.woff', '.woff2', '.ttf', '.otf', '.eot', '.fnt'],
  archives: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
  data: ['.json', '.xml', '.yaml', '.yml', '.toml', '.csv'],
  code: ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h'],
}

// ─────────────────────────────────────────────
// GET FILE TYPE CATEGORY
// ─────────────────────────────────────────────

function getFileTypeCategory(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  
  for (const [category, extensions] of Object.entries(FILE_TYPE_MAP)) {
    if (extensions.includes(ext)) {
      return category
    }
  }
  
  return 'other'
}

// ─────────────────────────────────────────────
// CATEGORIZE ASSETS FOLDER
// ─────────────────────────────────────────────

interface CategorizedAssets {
  [category: string]: string[]
}

export function categorizeAssets(folderPath: string): CategorizedAssets {
  const result: CategorizedAssets = {}
  
  // Return empty if folder doesn't exist
  if (!fs.existsSync(folderPath)) {
    return result
  }
  
  try {
    const files = fs.readdirSync(folderPath)
    
    for (const file of files) {
      const fullPath = path.join(folderPath, file)
      const stat = fs.statSync(fullPath)
      
      // Skip directories and hidden files
      if (stat.isDirectory() || file.startsWith('.')) {
        continue
      }
      
      const category = getFileTypeCategory(file)
      
      if (!result[category]) {
        result[category] = []
      }
      
      result[category].push(file)
    }
  } catch (err) {
    console.error(`[Arkzen Assets] Error reading folder ${folderPath}:`, err)
  }
  
  return result
}

// ─────────────────────────────────────────────
// COPY ASSETS TO PUBLIC FOLDER
// ─────────────────────────────────────────────

export function copyAssetsToPublic(
  tatName: string,
  assetsPath: string,
  publicPath: string
): boolean {
  // Return early if assets folder doesn't exist
  if (!fs.existsSync(assetsPath)) {
    return false
  }
  
  try {
    const categorized = categorizeAssets(assetsPath)
    
    // If no assets, return
    if (Object.keys(categorized).length === 0) {
      return false
    }
    
    // Create base assets directory
    const baseAssetsDir = path.join(publicPath, 'assets', tatName)
    if (!fs.existsSync(baseAssetsDir)) {
      fs.mkdirSync(baseAssetsDir, { recursive: true })
    }
    
    // Copy each file to its category folder
    for (const [category, files] of Object.entries(categorized)) {
      const categoryDir = path.join(baseAssetsDir, category)
      
      // Create category folder
      if (!fs.existsSync(categoryDir)) {
        fs.mkdirSync(categoryDir, { recursive: true })
      }
      
      // Copy files
      for (const file of files) {
        const source = path.join(assetsPath, file)
        const dest = path.join(categoryDir, file)
        
        try {
          fs.copyFileSync(source, dest)
        } catch (err) {
          console.warn(`[Arkzen Assets] Failed to copy ${file}:`, err)
        }
      }
    }
    
    console.log(`[Arkzen Assets] ✓ Distributed assets for ${tatName} → /public/assets/${tatName}`)
    return true
  } catch (err) {
    console.error(`[Arkzen Assets] Error during asset distribution:`, err)
    return false
  }
}

// ─────────────────────────────────────────────
// CLEAN OLD ASSETS (OPTIONAL)
// ─────────────────────────────────────────────

export function cleanOldAssets(tatName: string, publicPath: string): boolean {
  try {
    const assetsDir = path.join(publicPath, 'assets', tatName)
    
    if (fs.existsSync(assetsDir)) {
      fs.rmSync(assetsDir, { recursive: true, force: true })
      console.log(`[Arkzen Assets] ✓ Cleaned old assets for ${tatName}`)
      return true
    }
  } catch (err) {
    console.warn(`[Arkzen Assets] Failed to clean old assets:`, err)
  }
  
  return false
}

// ─────────────────────────────────────────────
// SUPPORTED FILE TYPES (FOR DOCUMENTATION)
// ─────────────────────────────────────────────

export function getSupportedFileTypes(): Record<string, string[]> {
  return FILE_TYPE_MAP
}

export function getSupportedExtensions(): string[] {
  const extensions: string[] = []
  for (const exts of Object.values(FILE_TYPE_MAP)) {
    extensions.push(...exts)
  }
  return extensions.sort()
}
