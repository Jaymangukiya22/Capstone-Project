import { useState } from 'react'
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

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const renderNode = (node: QuestionTreeNode) => {
    const isExpanded = expandedNodes.has(node.id)
    const isSelected = selectedNodeId === node.id
    const hasChildren = node.children && node.children.length > 0

    const getIcon = () => {
      if (node.type === 'global') {
        return <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      } else if (node.type === 'category') {
        return <FolderTree className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      } else {
        return <Layers className="h-3 w-3 text-orange-600 dark:text-orange-400" />
      }
    }

    const getIndentation = () => {
      return node.level * 16 // 16px per level
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
            {hasChildren && (
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
            )}
            
            <div className={cn(
              "flex items-center justify-center rounded",
              node.type === 'global' ? "w-6 h-6 bg-blue-100 dark:bg-blue-900/30" :
              node.type === 'category' ? "w-6 h-6 bg-blue-100 dark:bg-blue-900/30" :
              "w-5 h-5 bg-orange-100 dark:bg-orange-900/30"
            )}>
              {getIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                {node.name}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {node.totalQuestionCount} question{node.totalQuestionCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Render children */}
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.children!.map(child => renderNode(child))}
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
          {treeNodes.map(node => renderNode(node))}
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
