import type { Category, Question } from "@/types"

export interface QuestionTreeNode {
  id: string
  name: string
  type: 'category' | 'subcategory' | 'global'
  level: number
  questionCount: number
  totalQuestionCount: number // including descendants
  children?: QuestionTreeNode[]
}

/**
 * Generates a tree structure with question counts for the question bank
 */
export function generateQuestionTree(categories: Category[], questions: Question[]): QuestionTreeNode[] {
  const tree: QuestionTreeNode[] = []

  // Add global/unassigned questions node
  const globalQuestions = questions.filter(q => !q.categoryId)
  tree.push({
    id: 'global',
    name: 'Global / Unassigned',
    type: 'global',
    level: 0,
    questionCount: globalQuestions.length,
    totalQuestionCount: globalQuestions.length
  })

  // Process categories
  categories.forEach(category => {
    const categoryNode = processCategoryNode(category, questions, 0)
    tree.push(categoryNode)
  })

  return tree
}

function processCategoryNode(category: Category, questions: Question[], level: number): QuestionTreeNode {
  const children: QuestionTreeNode[] = []
  
  // Process subcategories recursively
  category.subcategories.forEach(subcategory => {
    const subcategoryNode = processSubcategoryNode(subcategory, questions, level + 1)
    children.push(subcategoryNode)
  })

  // Count questions directly in this category
  const directQuestions = questions.filter(q => q.categoryId === category.id && !q.subcategoryId)
  
  // Calculate total questions (direct + all descendants)
  const totalQuestionCount = directQuestions.length + 
    children.reduce((sum, child) => sum + child.totalQuestionCount, 0)

  return {
    id: category.id,
    name: category.name,
    type: 'category',
    level,
    questionCount: directQuestions.length,
    totalQuestionCount,
    children: children.length > 0 ? children : undefined
  }
}

function processSubcategoryNode(subcategory: any, questions: Question[], level: number): QuestionTreeNode {
  const children: QuestionTreeNode[] = []
  
  // Process nested subcategories recursively
  if (subcategory.subcategories) {
    subcategory.subcategories.forEach((nestedSub: any) => {
      const nestedNode = processSubcategoryNode(nestedSub, questions, level + 1)
      children.push(nestedNode)
    })
  }

  // Count questions directly in this subcategory
  const directQuestions = questions.filter(q => q.subcategoryId === subcategory.id)
  
  // Calculate total questions (direct + all descendants)
  const totalQuestionCount = directQuestions.length + 
    children.reduce((sum, child) => sum + child.totalQuestionCount, 0)

  return {
    id: subcategory.id,
    name: subcategory.name,
    type: 'subcategory',
    level,
    questionCount: directQuestions.length,
    totalQuestionCount,
    children: children.length > 0 ? children : undefined
  }
}

/**
 * Filters questions based on selected tree node
 */
export function filterQuestionsByNode(
  questions: Question[], 
  nodeId: string, 
  nodeType: 'category' | 'subcategory' | 'global',
  includeDescendants: boolean = true
): Question[] {
  if (nodeType === 'global') {
    return questions.filter(q => !q.categoryId)
  }

  if (nodeType === 'category') {
    if (includeDescendants) {
      return questions.filter(q => q.categoryId === nodeId)
    } else {
      return questions.filter(q => q.categoryId === nodeId && !q.subcategoryId)
    }
  }

  if (nodeType === 'subcategory') {
    if (includeDescendants) {
      // For subcategories, we need to find all descendant subcategories
      return questions.filter(q => q.subcategoryId === nodeId || isDescendantSubcategory(q.subcategoryId, nodeId))
    } else {
      return questions.filter(q => q.subcategoryId === nodeId)
    }
  }

  return questions
}

/**
 * Helper function to check if a subcategory is a descendant of another
 */
function isDescendantSubcategory(_childId: string | undefined, _parentId: string): boolean {
  // This would need to traverse the category tree to check ancestry
  // For now, returning false as we'll implement this when needed
  return false
}

/**
 * Searches questions by text, tags, or options
 */
export function searchQuestions(questions: Question[], searchTerm: string): Question[] {
  if (!searchTerm.trim()) return questions

  const term = searchTerm.toLowerCase()
  
  return questions.filter(question => {
    // Search in question text
    if (question.text.toLowerCase().includes(term)) return true
    
    // Search in tags
    if (question.tags.some(tag => tag.toLowerCase().includes(term))) return true
    
    // Search in options
    const optionValues = Object.values(question.options)
    if (optionValues.some(option => option.toLowerCase().includes(term))) return true
    
    return false
  })
}

/**
 * Filters questions by difficulty
 */
export function filterQuestionsByDifficulty(
  questions: Question[], 
  difficulty: 'all' | 'easy' | 'intermediate' | 'hard'
): Question[] {
  if (difficulty === 'all') return questions
  return questions.filter(q => q.difficulty === difficulty)
}

/**
 * Gets difficulty badge color
 */
export function getDifficultyColor(difficulty: 'easy' | 'intermediate' | 'hard'): string {
  switch (difficulty) {
    case 'easy':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'intermediate':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
    case 'hard':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}
