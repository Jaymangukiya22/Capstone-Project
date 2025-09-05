import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
      bgColor: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
      borderColor: "border-blue-200 dark:border-blue-800",
      change: "+12% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Total Quizzes", 
      value: stats.totalQuizzes,
      icon: FileQuestion,
      color: "text-green-600 dark:text-green-400",
      bgColor: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
      borderColor: "border-green-200 dark:border-green-800",
      change: "+8% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Subcategories",
      value: stats.totalSubcategories,
      icon: Layers,
      color: "text-orange-600 dark:text-orange-400", 
      bgColor: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900",
      borderColor: "border-orange-200 dark:border-orange-800",
      change: "+5% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    },
    {
      title: "Recently Added",
      value: stats.recentlyAdded,
      icon: Plus,
      color: "text-purple-600 dark:text-purple-400",
      bgColor: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
      borderColor: "border-purple-200 dark:border-purple-800",
      change: "+23% from last month",
      changeColor: "text-green-600 dark:text-green-400"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Card key={card.title} className={`border ${card.borderColor} shadow-sm hover:shadow-md transition-shadow duration-200`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {card.title}
              </CardTitle>
              <div className={`p-2.5 rounded-xl shadow-sm ${card.bgColor}`}>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{card.value}</div>
              <p className={`text-xs font-medium ${card.changeColor} flex items-center`}>
                <span className="mr-1">↗</span>
                {card.change}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
