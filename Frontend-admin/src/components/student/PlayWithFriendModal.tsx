import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import {
  Copy,
  Share2,
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { generateJoinCode, type StudentQuiz } from '@/data/mockStudentData'

interface PlayWithFriendModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedQuiz: StudentQuiz | null
  onJoinGame: (code: string) => void
  onCreateGame: (code: string) => void
}

export function PlayWithFriendModal({ 
  open, 
  onOpenChange, 
  selectedQuiz, 
  onJoinGame, 
  onCreateGame 
}: PlayWithFriendModalProps) {
  const [activeTab, setActiveTab] = useState('generate')
  const [generatedCode, setGeneratedCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isJoining, setIsJoining] = useState(false)

  const handleGenerateCode = async () => {
    if (!selectedQuiz) return
    
    setIsGenerating(true)
    // Simulate API call delay
    setTimeout(() => {
      const code = generateJoinCode()
      setGeneratedCode(code)
      setIsGenerating(false)
      toast({
        title: "Game Created!",
        description: "Share this code with your friend to start playing together.",
      })
    }, 1000)
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode)
    toast({
      title: "Code Copied!",
      description: "The game code has been copied to your clipboard.",
    })
  }

  const handleShareCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join my QuizMaster game!',
        text: `Join my quiz "${selectedQuiz?.name}" using code: ${generatedCode}`,
        url: window.location.origin
      })
    } else {
      handleCopyCode()
    }
  }

  const handleJoinGame = () => {
    if (!joinCode.trim()) {
      toast({
        title: "Invalid Code",
        description: "Please enter a valid game code.",
        variant: "destructive"
      })
      return
    }

    setIsJoining(true)
    // Simulate API call delay
    setTimeout(() => {
      setIsJoining(false)
      onJoinGame(joinCode.trim().toUpperCase())
      onOpenChange(false)
    }, 1000)
  }

  const handleCreateGame = () => {
    onCreateGame(generatedCode)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Play with Friend</span>
          </DialogTitle>
          <DialogDescription>
            Create a private game or join an existing one using a game code.
          </DialogDescription>
        </DialogHeader>

        {selectedQuiz && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm text-gray-900 dark:text-white">
                {selectedQuiz.name}
              </h4>
              <Badge variant="outline" className="text-xs">
                {selectedQuiz.difficulty}
              </Badge>
            </div>
            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{selectedQuiz.estimatedDuration}m</span>
              </div>
              {/* <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>Max {selectedQuiz.maxPlayers} players</span>
              </div> */}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Code</TabsTrigger>
            <TabsTrigger value="join">Enter Code</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-4">
            <div className="text-center space-y-4">
              {!generatedCode ? (
                <>
                  <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <Users className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Create a private game room for you and your friends
                    </p>
                  </div>
                  <Button 
                    onClick={handleGenerateCode} 
                    disabled={isGenerating || !selectedQuiz}
                    className="w-full"
                  >
                    {isGenerating ? "Generating..." : "Generate Game Code"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="p-6 border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 rounded-lg">
                    <CheckCircle className="h-8 w-8 mx-auto mb-3 text-green-600 dark:text-green-400" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Your game code is ready! Share it with your friend.
                    </p>
                    <div className="bg-white dark:bg-gray-800 border rounded-lg p-4 mb-4">
                      <Label className="text-xs text-gray-500 dark:text-gray-400">Game Code</Label>
                      <div className="text-2xl font-mono font-bold text-center text-gray-900 dark:text-white tracking-wider">
                        {generatedCode}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" onClick={handleCopyCode} className="flex-1">
                        <Copy className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button variant="outline" onClick={handleShareCode} className="flex-1">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </div>
                  <Button onClick={handleCreateGame} className="w-full">
                    Start Game & Wait for Friend
                  </Button>
                </>
              )}
            </div>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-4">
              <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Enter the game code shared by your friend
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="joinCode">Game Code</Label>
                <Input
                  id="joinCode"
                  placeholder="Enter 6-character code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="text-center font-mono text-lg tracking-wider"
                  maxLength={6}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Game codes are 6 characters long (e.g., ABC123)
                </p>
              </div>

              <Button 
                onClick={handleJoinGame} 
                disabled={isJoining || joinCode.length !== 6}
                className="w-full"
              >
                {isJoining ? "Joining..." : "Join Game"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
