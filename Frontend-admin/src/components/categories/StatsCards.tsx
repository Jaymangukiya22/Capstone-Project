import { FolderTree, Layers, FileQuestion, Plus } from "lucide-react"
import type { Stats } from "@/types"

interface StatsCardsProps {
  stats: Stats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: "Total Categories",
      value: stats.totalCategories,
      icon: FolderTree,
      color: "text-blue-600 dark:text-blue-400",
      change: "+12% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Total Quizzes", 
      value: stats.totalQuizzes,
      icon: FileQuestion,
      color: "text-green-600 dark:text-green-400",
      change: "+8% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Subcategories",
      value: stats.totalSubcategories,
      icon: Layers,
      color: "text-orange-600 dark:text-orange-400",
      change: "+5% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Recently Added",
      value: stats.recentlyAdded,
      icon: Plus,
      color: "text-purple-600 dark:text-purple-400",
      change: "+23% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <div key={card.title} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.title}
              </h3>
              <div className="w-8 h-8 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </div>
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-1">{card.value}</div>
            <p className={`text-xs ${card.changeColor} flex items-center`}>
              <span className="mr-1">↗</span>
              {card.change}
            </p>
          </div>
        )
      })}
    </div>
  )
}
