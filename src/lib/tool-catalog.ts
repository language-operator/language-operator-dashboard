import yaml from 'js-yaml'
import { ToolCatalog, ToolCatalogEntry } from '@/types/tool-catalog'
import { LanguageTool } from '@/types/tool'

const CATALOG_URL = 'https://raw.githubusercontent.com/language-operator/language-tools/main/index.yaml'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  data: ToolCatalog
  timestamp: number
}

let cache: CacheEntry | null = null

export async function fetchToolCatalog(): Promise<ToolCatalog> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data
  }

  try {
    const response = await fetch(CATALOG_URL, {
      headers: {
        'Accept': 'text/yaml,text/plain,*/*',
      },
      cache: 'no-cache',
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch tool catalog: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()
    const data = yaml.load(text) as ToolCatalog

    // Validate the structure
    if (!data.version || !data.tools || typeof data.tools !== 'object') {
      throw new Error('Invalid tool catalog format')
    }

    // Cache the result
    cache = {
      data,
      timestamp: Date.now(),
    }

    return data
  } catch (error) {
    console.error('Error fetching tool catalog:', error)
    
    // Return empty catalog on error
    return {
      version: '1.0',
      generated: new Date().toISOString(),
      tools: {},
    }
  }
}

export function getToolById(catalog: ToolCatalog, toolId: string): ToolCatalogEntry | undefined {
  return catalog.tools[toolId]
}

export function searchTools(catalog: ToolCatalog, query: string): ToolCatalogEntry[] {
  const lowercaseQuery = query.toLowerCase()

  return Object.values(catalog.tools).filter(tool => {
    const displayName = tool.metadata.annotations?.['langop.io/display-name'] || tool.metadata.name || ''
    const description = tool.spec?.description || ''
    const tags = tool.metadata.annotations?.['langop.io/tags']?.split(',').map(t => t.trim()) || []

    return (tool.metadata.name || '').toLowerCase().includes(lowercaseQuery) ||
      displayName.toLowerCase().includes(lowercaseQuery) ||
      description.toLowerCase().includes(lowercaseQuery) ||
      tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  })
}

export function getToolsByTag(catalog: ToolCatalog, tag: string): ToolCatalogEntry[] {
  return Object.values(catalog.tools).filter(tool => {
    const tags = tool.metadata.annotations?.['langop.io/tags']?.split(',').map(t => t.trim()) || []
    return tags.includes(tag)
  })
}

export function prepareCatalogEntryForInstallation(
  entry: ToolCatalogEntry,
  namespace: string,
  clusterName?: string
): LanguageTool {
  // Deep clone to avoid mutating catalog
  const tool: LanguageTool = JSON.parse(JSON.stringify(entry))

  // Inject required metadata
  tool.metadata.namespace = namespace

  // Ensure labels exist
  if (!tool.metadata.labels) {
    tool.metadata.labels = {}
  }

  // Add catalog labels (preserve existing)
  tool.metadata.labels['langop.io/source'] = 'catalog'
  tool.metadata.labels['langop.io/catalog-name'] = entry.metadata.name || ''

  // Inject cluster reference if provided
  if (clusterName && tool.spec) {
    tool.spec.clusterRef = clusterName
  }

  return tool
}