import React, { useState } from 'react';
import { useQuizNavigationGuard } from '@/hooks/useNavigationGuard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function NavigationGuardTest() {
  const [isGuardActive, setIsGuardActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Test the navigation guard
  const { disableGuard } = useQuizNavigationGuard(isGuardActive, isCompleted);
  
  const handleStartTest = () => {
    setIsGuardActive(true);
    setIsCompleted(false);
  };
  
  const handleCompleteTest = () => {
    setIsCompleted(true);
    disableGuard();
  };
  
  const handleResetTest = () => {
    setIsGuardActive(false);
    setIsCompleted(false);
  };
  
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Navigation Guard Test</CardTitle>
            <CardDescription>
              Test the navigation blocking functionality during quiz mode
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Display */}
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-semibold mb-2">Current Status:</h3>
              <div className="space-y-1 text-sm">
                <div>Guard Active: <span className={isGuardActive ? 'text-green-600' : 'text-red-600'}>{isGuardActive ? 'Yes' : 'No'}</span></div>
                <div>Quiz Completed: <span className={isCompleted ? 'text-green-600' : 'text-red-600'}>{isCompleted ? 'Yes' : 'No'}</span></div>
                <div>Navigation Blocked: <span className={isGuardActive && !isCompleted ? 'text-red-600' : 'text-green-600'}>{isGuardActive && !isCompleted ? 'Yes' : 'No'}</span></div>
              </div>
            </div>
            
            {/* Warning Banner */}
            {isGuardActive && !isCompleted && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    Navigation Guard Active - Try using the back button!
                  </span>
                </div>
              </div>
            )}
            
            {/* Instructions */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2 text-blue-800">Test Instructions:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-700">
                <li>Click "Start Quiz Mode" to activate navigation guard</li>
                <li>Try using your browser's back button - it should be blocked</li>
                <li>You should see a toast notification when navigation is blocked</li>
                <li>Click "Complete Quiz" to disable the guard</li>
                <li>Now the back button should work normally</li>
              </ol>
            </div>
            
            {/* Control Buttons */}
            <div className="flex gap-4">
              <Button 
                onClick={handleStartTest}
                disabled={isGuardActive}
                variant={isGuardActive ? "secondary" : "default"}
              >
                Start Quiz Mode
              </Button>
              
              <Button 
                onClick={handleCompleteTest}
                disabled={!isGuardActive || isCompleted}
                variant="outline"
              >
                Complete Quiz
              </Button>
              
              <Button 
                onClick={handleResetTest}
                variant="ghost"
              >
                Reset Test
              </Button>
            </div>
            
            {/* Navigation Test Links */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-2">Test Navigation:</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <a href="/student-quiz" className="text-blue-600 hover:underline">
                    Try navigating to Quiz Selection
                  </a>
                  <span className="text-muted-foreground ml-2">
                    (Should be blocked when guard is active)
                  </span>
                </div>
                <div>
                  <a href="/dashboard" className="text-blue-600 hover:underline">
                    Try navigating to Dashboard
                  </a>
                  <span className="text-muted-foreground ml-2">
                    (Should be blocked when guard is active)
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
