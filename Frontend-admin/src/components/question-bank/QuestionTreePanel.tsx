import React, { useState } from 'react'
import { ChevronDown, ChevronRight, Globe, FolderTree, Layers, PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { QuestionTreeNode } from '@/utils/questionUtils'

interface QuestionTreePanelProps {
  treeNodes: QuestionTreeNode[]
  selectedNodeId: string | null
  onSelectNode: (nodeId: string, nodeType: 'category' | 'subcategory' | 'global') => void
  isCollapsed?: boolean
  onToggleCollapse?: () => void
}

export function QuestionTreePanel({ 
  treeNodes, 
  selectedNodeId, 
  onSelectNode,
  isCollapsed = false,
  onToggleCollapse
}: QuestionTreePanelProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(['global']))
  
  // Debug logging
  console.log('🔍 QuestionTreePanel render:', {
    treeNodesLength: treeNodes?.length,
    treeNodesType: typeof treeNodes,
    isArray: Array.isArray(treeNodes),
    firstNode: treeNodes?.[0],
    allNodes: treeNodes
  })

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: any): React.ReactElement => {
    const isSelected = selectedNodeId === node.id
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0

    const getIcon = () => {
      if (node.type === 'global') return <Globe className="h-4 w-4 text-blue-600" />
      if (node.type === 'category') return <FolderTree className="h-4 w-4 text-green-600" />
      if (node.type === 'subcategory') return <Layers className="h-4 w-4 text-purple-600" />
      return <FolderTree className="h-4 w-4 text-gray-600" />
    }

    const getIndentation = () => {
      return node.level * 20 // 20px per level for better hierarchy visibility
    }

    return (
      <div key={node.id} className="space-y-1">
        <div
          className={cn(
            "group flex items-center justify-between p-2 rounded-lg border transition-all duration-200 cursor-pointer",
            isSelected
              ? "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
          )}
          style={{ marginLeft: getIndentation() }}
          onClick={() => onSelectNode(node.id, node.type)}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {hasChildren ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleNode(node.id)
                }}
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
              </Button>
            ) : (
              <div className="w-6 flex justify-center">
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
              </div>
            )}
            
            {getIcon()}
            
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {node.name}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs">
            <span className={cn(
              "px-2 py-1 rounded-full font-medium",
              node.questionCount > 0 
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
            )}>
              {node.questionCount || 0}
            </span>
          </div>
        </div>
        
        {/* Render children if expanded */}
        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children!.map((child: any) => renderNode(child))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Question Bank
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Browse by category
              </p>
            </div>
          )}
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="p-1"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
      {!isCollapsed && (
        <div className="p-4 space-y-2 overflow-y-auto">
          {Array.isArray(treeNodes) && treeNodes.length > 0 ? (
            <>
              <div className="text-xs text-gray-500 mb-2">Found {treeNodes.length} categories</div>
              {treeNodes.map(node => renderNode(node))}
            </>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <div className="text-4xl mb-2">📁</div>
              <p className="text-sm">No categories found</p>
              <p className="text-xs mt-1">
                Tree nodes: {Array.isArray(treeNodes) ? treeNodes.length : 'not array'} | 
                Type: {typeof treeNodes}
              </p>
            </div>
          )}
        </div>
      )}
      {isCollapsed && (
        <div className="p-2 space-y-2 overflow-y-auto">
          {treeNodes.map(node => (
            <Button
              key={node.id}
              variant="ghost"
              size="sm"
              onClick={() => onSelectNode(node.id, node.type)}
              className={cn(
                "w-full p-2 justify-center",
                selectedNodeId === node.id
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              )}
              title={node.name}
            >
              {node.type === 'global' ? (
                <Globe className="h-4 w-4" />
              ) : node.type === 'category' ? (
                <FolderTree className="h-4 w-4" />
              ) : (
                <Layers className="h-4 w-4" />
              )}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
