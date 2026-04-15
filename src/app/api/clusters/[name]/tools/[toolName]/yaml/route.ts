import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/user-context'
import { k8sClient, extractItem } from '@/lib/k8s-client'
import { LanguageTool } from '@/types/tool'
import yaml from 'js-yaml'

// GET /api/clusters/[name]/tools/[toolName]/yaml - Get tool YAML


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string; toolName: string }> }
) {
  try {
    const { email } = await getAuthenticatedUser(request)
    

    const { name: clusterName, toolName } = await params
    if (!clusterName || !toolName) {
      return NextResponse.json({ error: 'Cluster name and tool name are required' }, { status: 400 })
    }

    // Fetch specific tool from organization namespace
    let tool: LanguageTool | null = null

    try {
      const response = await k8sClient.getLanguageTool(clusterName, toolName)
      tool = extractItem<LanguageTool>(response)
    } catch (k8sError) {
      // If tool not found, return 404
      if (k8sError instanceof Error && k8sError.message.includes('404')) {
        return NextResponse.json({ 
          error: 'Tool not found',
          details: `Tool "${toolName}" not found in cluster "${clusterName}"` 
        }, { status: 404 })
      }
      
      console.error('Error fetching tool from Kubernetes:', k8sError)
      throw k8sError
    }

    if (!tool) {
      return NextResponse.json({ 
        error: 'Tool not found',
        details: `Tool "${toolName}" not found in cluster "${clusterName}"` 
      }, { status: 404 })
    }

    // Verify tool belongs to user's organization
    const toolOrgLabel = tool.metadata?.labels?.['langop.io/organization-id']
    if (toolOrgLabel && toolOrgLabel !== '') {
      return NextResponse.json({ 
        error: 'Tool not found',
        details: `Tool "${toolName}" not found in cluster "${clusterName}"` 
      }, { status: 404 })
    }

    // Convert tool object to YAML
    const yamlContent = yaml.dump(tool, {
      indent: 2,
      lineWidth: 120,
      quotingType: '"',
      forceQuotes: false,
    })

    // Return as plain text with appropriate content-type
    return new NextResponse(yamlContent, {
      headers: {
        'Content-Type': 'text/yaml; charset=utf-8',
        'Cache-Control': 'no-cache',
      },
    })

  } catch (error) {
    console.error('Error fetching tool YAML:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch tool YAML',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}