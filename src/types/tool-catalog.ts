import { LanguageTool } from './tool'

// Catalog entries are now complete LanguageTool CRDs
export type ToolCatalogEntry = LanguageTool

export interface ToolCatalog {
  version: string
  generated: string
  tools: Record<string, ToolCatalogEntry>
}

// Helper to get display name from catalog entry
export function getToolDisplayName(tool: ToolCatalogEntry): string {
  return tool.metadata.annotations?.['langop.io/display-name'] || tool.metadata.name || ''
}

// Helper to get tags from catalog entry
export function getToolTags(tool: ToolCatalogEntry): string[] {
  const tagsStr = tool.metadata.annotations?.['langop.io/tags']
  return tagsStr ? tagsStr.split(',').map(t => t.trim()) : []
}

export interface InstalledTool {
  name: string
  namespace: string
  catalogName?: string
  status: {
    phase: 'Pending' | 'Ready' | 'Failed'
    message?: string
    lastUpdated: string
  }
  spec: any
}