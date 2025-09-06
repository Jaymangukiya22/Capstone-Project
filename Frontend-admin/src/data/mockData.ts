import type { Category, Stats } from "@/types"

export const mockStats: Stats = {
  totalCategories: 12,
  totalSubcategories: 8,
  totalQuizzes: 99,
  recentlyAdded: 3,
}

export const mockCategories: Category[] = [
  {
    id: "1",
    name: "Science & Technology",
    description: "Quizzes related to science and technology topics",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-20"),
    subcategories: [
      {
        id: "1-1",
        name: "Computer Science",
        description: "Programming, algorithms, and software development",
        categoryId: "1",
        createdAt: new Date("2024-01-16"),
        updatedAt: new Date("2024-01-18"),
        quizzes: [
          {
            id: "1-1-1",
            name: "JavaScript Fundamentals",
            description: "Basic JavaScript concepts and syntax",
            mode: "1v1",
            subcategoryId: "1-1",
            createdAt: new Date("2024-01-17"),
            updatedAt: new Date("2024-01-17"),
          },
          {
            id: "1-1-2",
            name: "React Basics",
            description: "Introduction to React components and hooks",
            mode: "multiplayer",
            subcategoryId: "1-1",
            createdAt: new Date("2024-01-18"),
            updatedAt: new Date("2024-01-18"),
          },
        ],
      },
      {
        id: "1-2",
        name: "Physics",
        description: "Physics concepts and principles",
        categoryId: "1",
        createdAt: new Date("2024-01-16"),
        updatedAt: new Date("2024-01-19"),
        quizzes: [
          {
            id: "1-2-1",
            name: "Quantum Mechanics",
            description: "Basic quantum physics principles",
            mode: "play-with-friend",
            subcategoryId: "1-2",
            createdAt: new Date("2024-01-19"),
            updatedAt: new Date("2024-01-19"),
          },
        ],
      },
    ],
  },
  {
    id: "2",
    name: "History & Culture",
    description: "Historical events and cultural knowledge",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-25"),
    subcategories: [
      {
        id: "2-1",
        name: "World History",
        description: "Major world historical events",
        categoryId: "2",
        createdAt: new Date("2024-01-11"),
        updatedAt: new Date("2024-01-12"),
        quizzes: [
          {
            id: "2-1-1",
            name: "World War II",
            description: "Events and figures from WWII",
            mode: "multiplayer",
            subcategoryId: "2-1",
            createdAt: new Date("2024-01-12"),
            updatedAt: new Date("2024-01-12"),
          },
          {
            id: "2-1-2",
            name: "Ancient Civilizations",
            description: "Ancient Rome, Greece, and Egypt",
            mode: "1v1",
            subcategoryId: "2-1",
            createdAt: new Date("2024-01-13"),
            updatedAt: new Date("2024-01-13"),
          },
        ],
      },
    ],
  },
  {
    id: "3",
    name: "Art & Literature",
    description: "Art, literature, and creative works",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-22"),
    subcategories: [
      {
        id: "3-1",
        name: "Classic Literature",
        description: "Famous literary works and authors",
        categoryId: "3",
        createdAt: new Date("2024-01-06"),
        updatedAt: new Date("2024-01-07"),
        quizzes: [
          {
            id: "3-1-1",
            name: "Shakespeare's Works",
            description: "Plays and sonnets by William Shakespeare",
            mode: "play-with-friend",
            subcategoryId: "3-1",
            createdAt: new Date("2024-01-07"),
            updatedAt: new Date("2024-01-07"),
          },
        ],
      },
    ],
  },
]
