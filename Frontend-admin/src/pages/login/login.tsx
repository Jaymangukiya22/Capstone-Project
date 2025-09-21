import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm() {
  return (
    <div className="min-h-screen flex">
      {/* Logo at top-left corner */}
      <div className="absolute top-6 left-6 z-20">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-lg bg-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
          <div className="ml-3">
            <span className="font-bold text-xl text-gray-900 dark:text-white">QuizMaster</span>
          </div>
        </div>
      </div>

      {/* Left Side - Login Form (50%) */}
      <div className="w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16 xl:px-20 bg-white dark:bg-gray-900">
        <div className="w-full max-w-md mx-auto">
          <form className="space-y-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Login to your account
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter your email below to login to your account
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="admin@example.com" 
                  required 
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Password
                  </Label>
                  <a
                    href="#"
                    className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Forgot password?
                  </a>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  className="h-11"
                />
              </div>
            </div>
            
            <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white">
              Sign in
            </Button>
            
            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Don&apos;t have an account?{" "}
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                Sign up
              </a>
            </p>
          </form>
        </div>
      </div>
      
      {/* Right Side - Image/Illustration (50%) */}
      <div className="w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="absolute inset-0" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}></div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center text-center p-12 text-white h-full">
          <div className="mb-8">
            <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 mx-auto backdrop-blur-sm">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-4">Welcome to QuizMaster</h2>
            <p className="text-blue-100 text-lg leading-relaxed max-w-md">
              Create, manage, and deploy engaging quizzes with our comprehensive admin platform. 
              Empower learning through interactive assessments.
            </p>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-1 gap-4 max-w-sm">
            <div className="flex items-center text-blue-100">
              <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
              <span className="text-sm">Advanced Quiz Builder</span>
            </div>
            <div className="flex items-center text-blue-100">
              <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
              <span className="text-sm">Real-time Analytics</span>
            </div>
            <div className="flex items-center text-blue-100">
              <div className="w-2 h-2 bg-blue-300 rounded-full mr-3"></div>
              <span className="text-sm">Student Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
