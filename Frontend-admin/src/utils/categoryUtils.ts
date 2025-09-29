import type { Category, Subcategory } from "@/types"

export interface ParentOption {
  id: string
  name: string
  type: 'category' | 'subcategory'
  level: number
  displayName: string
}

/**
 * Traverses the category tree and generates a flat list of all possible parents
 * (categories and subcategories) for the parent dropdown
 */
export function generateParentOptions(categories: Category[]): ParentOption[] {
  const options: ParentOption[] = []

  const traverseSubcategories = (subcategories: Subcategory[] | undefined, level: number) => {
    if (!subcategories || !Array.isArray(subcategories)) return
    
    subcategories.forEach(subcategory => {
      const indent = '  '.repeat(level)
      options.push({
        id: subcategory.id,
        name: subcategory.name,
        type: 'subcategory',
        level,
        displayName: `${indent}${subcategory.name}`
      })

      // Recursively traverse nested subcategories
      if (subcategory.subcategories && subcategory.subcategories.length > 0) {
        traverseSubcategories(subcategory.subcategories, level + 1)
      }
    })
  }

  if (!categories || !Array.isArray(categories)) {
    return options
  }

  categories.forEach(category => {
    // Add the category as a parent option
    options.push({
      id: category.id,
      name: category.name,
      type: 'category',
      level: 0,
      displayName: category.name
    })

    // Add all subcategories (including nested ones) as parent options
    if (category.subcategories) {
      traverseSubcategories(category.subcategories, 1)
    }
  })

  return options
}

/**
 * Finds a subcategory by ID in the category tree
 */
export function findSubcategoryById(categories: Category[], subcategoryId: string): Subcategory | null {
  if (!categories || !Array.isArray(categories)) return null
  
  const searchInSubcategories = (subcategories: Subcategory[] | undefined): Subcategory | null => {
    if (!subcategories || !Array.isArray(subcategories)) return null
    for (const subcategory of subcategories) {
      if (subcategory.id === subcategoryId) {
        return subcategory
      }
      
      // Search in nested subcategories
      const found = searchInSubcategories(subcategory.subcategories)
      if (found) {
        return found
      }
    }
    return null
  }

  for (const category of categories) {
    const found = searchInSubcategories(category.subcategories)
    if (found) {
      return found
    }
  }
  
  return null
}

/**
 * Adds a new subcategory to the appropriate parent in the category tree
 */
export function addSubcategoryToTree(
  categories: Category[],
  newSubcategory: Omit<Subcategory, 'subcategories'>,
  parentId: string,
  parentType: 'category' | 'subcategory'
): Category[] {
  const subcategoryWithChildren: Subcategory = {
    ...newSubcategory,
    subcategories: []
  }

  const addToSubcategories = (subcategories: Subcategory[]): Subcategory[] => {
    return subcategories.map(subcategory => {
      if (subcategory.id === parentId) {
        return {
          ...subcategory,
          subcategories: [...subcategory.subcategories, subcategoryWithChildren]
        }
      }
      
      return {
        ...subcategory,
        subcategories: addToSubcategories(subcategory.subcategories)
      }
    })
  }

  return categories.map(category => {
    if (parentType === 'category' && category.id === parentId) {
      return {
        ...category,
        subcategories: [...category.subcategories, subcategoryWithChildren]
      }
    }
    
    if (parentType === 'subcategory') {
      return {
        ...category,
        subcategories: addToSubcategories(category.subcategories)
      }
    }
    
    return category
  })
}
