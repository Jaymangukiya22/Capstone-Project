import React, { useState } from 'react'
import { ChevronRight, ChevronDown, Folder, FolderOpen, BookOpen, Globe } from 'lucide-react'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import type { Category as ApiCategory, Quiz as ApiQuiz } from '../../types/api'

interface QuestionBankTreeProps {
  categories: ApiCategory[]
  quizzes: ApiQuiz[]
  selectedItem: { type: 'category' | 'subcategory' | 'quiz' | 'global'; id: string } | null
  onSelectItem: (type: 'category' | 'subcategory' | 'quiz' | 'global', id: string) => void
}

interface TreeNodeProps {
  category: ApiCategory
  level: number
  quizzes: ApiQuiz[]
  selectedItem: { type: 'category' | 'subcategory' | 'quiz' | 'global'; id: string } | null
  onSelectItem: (type: 'category' | 'subcategory' | 'quiz' | 'global', id: string) => void
  expandedNodes: Set<string>
  onToggleNode: (nodeId: string) => void
  allCategories: ApiCategory[]
}

function TreeNode({ 
  category, 
  level, 
  quizzes, 
  selectedItem, 
  onSelectItem, 
  expandedNodes, 
  onToggleNode,
  allCategories 
}: TreeNodeProps) {
  const nodeId = `category-${category.id}`
  const isExpanded = expandedNodes.has(nodeId)
  
  // Get subcategories from flat array
  const subcategories = allCategories.filter(cat => cat.parentId === category.id)
  const categoryQuizzes = quizzes.filter(quiz => quiz.categoryId === category.id)
  const hasChildren = subcategories.length > 0 || categoryQuizzes.length > 0
  
  // Debug logging for this category
  console.log(`📂 Category "${category.name}" (ID: ${category.id}):`, {
    subcategories: subcategories.length,
    quizzes: categoryQuizzes.length,
    hasChildren,
    level
  })
  
  const isSelected = selectedItem?.type === 'category' && selectedItem.id === category.id.toString()

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasChildren || categoryQuizzes.length > 0) {
      onToggleNode(nodeId)
    }
  }

  const handleSelect = () => {
    onSelectItem('category', category.id.toString())
  }

  return (
    <div>
      {/* Category Node */}
      <div
        className={cn(
          "flex items-center space-x-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
          isSelected && "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
        )}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
        onClick={handleSelect}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-4 w-4 p-0 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          onClick={handleToggle}
        >
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-3 w-3 text-gray-500" />
            ) : (
              <ChevronRight className="h-3 w-3 text-gray-500" />
            )
          ) : (
            <div className="h-3 w-3" />
          )}
        </Button>
        
        {isExpanded ? (
          <FolderOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <Folder className="h-4 w-4 text-blue-500" />
        )}
        
        <span className="text-sm font-medium truncate">{category.name}</span>
        
        {/* Count badges */}
        <div className="ml-auto flex items-center space-x-1">
          {subcategories.length > 0 && (
            <span className="text-xs bg-blue-100 dark:bg-blue-700 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded">
              {subcategories.length} sub
            </span>
          )}
          {categoryQuizzes.length > 0 && (
            <span className="text-xs bg-green-100 dark:bg-green-700 text-green-600 dark:text-green-300 px-1.5 py-0.5 rounded">
              {categoryQuizzes.length} quiz
            </span>
          )}
        </div>
      </div>

      {/* Children */}
      {isExpanded && (
        <div>
          {/* Subcategories */}
          {subcategories.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              level={level + 1}
              quizzes={quizzes}
              selectedItem={selectedItem}
              onSelectItem={onSelectItem}
              expandedNodes={expandedNodes}
              onToggleNode={onToggleNode}
              allCategories={allCategories}
            />
          ))}
          
          {/* Quizzes */}
          {categoryQuizzes.map((quiz) => (
            <QuizNode
              key={quiz.id}
              quiz={quiz}
              level={level + 1}
              selectedItem={selectedItem}
              onSelectItem={onSelectItem}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface QuizNodeProps {
  quiz: ApiQuiz
  level: number
  selectedItem: { type: 'category' | 'subcategory' | 'quiz' | 'global'; id: string } | null
  onSelectItem: (type: 'category' | 'subcategory' | 'quiz' | 'global', id: string) => void
}

function QuizNode({ quiz, level, selectedItem, onSelectItem }: QuizNodeProps) {
  const isSelected = selectedItem?.type === 'quiz' && selectedItem.id === quiz.id.toString()

  const handleSelect = () => {
    onSelectItem('quiz', quiz.id.toString())
  }

  return (
    <div
      className={cn(
        "flex items-center space-x-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
        isSelected && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
      )}
      style={{ paddingLeft: `${level * 16 + 28}px` }}
      onClick={handleSelect}
    >
      <BookOpen className="h-4 w-4 text-green-500" />
      <span className="text-sm truncate">{quiz.title}</span>
    </div>
  )
}

export function QuestionBankTree({ categories, quizzes, selectedItem, onSelectItem }: QuestionBankTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const handleToggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  // Debug logging
  console.log('🏗️ QuestionBankTree - Categories:', categories)
  console.log('🎯 QuestionBankTree - Quizzes:', quizzes)

  // Filter to get only root categories (no parent)
  const rootCategories = categories.filter(cat => cat.parentId === null)
  console.log('📁 Root categories:', rootCategories)

  return (
    <div className="space-y-1">
      {/* Global Questions Node */}
      <div
        className={cn(
          "flex items-center space-x-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors",
          selectedItem?.type === 'global' && "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300"
        )}
        onClick={() => onSelectItem('global', 'global')}
      >
        <Globe className="h-4 w-4 text-purple-500" />
        <span className="text-sm font-medium">Global Questions</span>
      </div>

      {/* Category Tree */}
      {rootCategories.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <Folder className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No categories found</p>
        </div>
      ) : (
        rootCategories.map((category) => (
          <TreeNode
            key={category.id}
            category={category}
            level={0}
            quizzes={quizzes}
            selectedItem={selectedItem}
            onSelectItem={onSelectItem}
            expandedNodes={expandedNodes}
            onToggleNode={handleToggleNode}
            allCategories={categories}
          />
        ))
      )}
    </div>
  )
}
