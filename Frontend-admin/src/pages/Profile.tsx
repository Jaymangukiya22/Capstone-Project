import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { User, Mail, Calendar, Trophy, Target } from "lucide-react"

export function Profile() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      <div className="grid gap-6">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-16 w-16 rounded-full bg-blue-500 dark:bg-blue-600 flex items-center justify-center">
                  <span className="text-2xl font-medium text-white">
                    {user.firstName?.charAt(0) || user.username?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-2xl">
                    {user.firstName && user.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user.username}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant={user.role === 'ADMIN' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <User className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Username</p>
                  <p className="font-medium">{user.username}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              {user.createdAt && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Member Since</p>
                    <p className="font-medium">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              )}

              {user.lastLoginAt && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Last Login</p>
                    <p className="font-medium">{formatDate(user.lastLoginAt)}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Card - Only for Players */}
        {user.role === 'PLAYER' && (
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
              <CardDescription>Your quiz performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Trophy className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">ELO Rating</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {user.eloRating || 1200}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Matches</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {user.totalMatches || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Trophy className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Win Rate</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {user.totalMatches 
                        ? `${Math.round(((user.wins || 0) / user.totalMatches) * 100)}%`
                        : '0%'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Admin Info Card */}
        {user.role === 'ADMIN' && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Information</CardTitle>
              <CardDescription>Your administrative privileges</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                You have full access to manage categories, quizzes, questions, and users.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
