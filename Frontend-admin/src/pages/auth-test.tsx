import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function AuthTestPage() {
  const { user, isAuthenticated, login, register, logout, error, clearError } = useAuth();
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    username: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(loginData);
      console.log('Login successful!');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register({
        ...registerData,
        username: registerData.username || registerData.email.split('@')[0],
        role: 'ADMIN'
      });
      console.log('Registration successful!');
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  if (isAuthenticated && user) {
    return (
      <div className="container mx-auto p-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Test - Success!</CardTitle>
            <CardDescription>You are successfully logged in</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-md">
              <h3 className="font-semibold text-green-800">User Information:</h3>
              <div className="mt-2 space-y-1 text-sm text-green-700">
                <p><strong>ID:</strong> {user.id}</p>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>Name:</strong> {user.firstName} {user.lastName}</p>
                <p><strong>Role:</strong> {user.role}</p>
                {user.eloRating && <p><strong>ELO Rating:</strong> {user.eloRating}</p>}
              </div>
            </div>
            
            <Button onClick={logout} variant="outline">
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Authentication Test Page</h1>
        <p className="text-gray-600">Test login and registration functionality</p>
      </div>

      {error && (
        <div className="mb-6 p-4 text-red-600 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <Button onClick={clearError} variant="ghost" size="sm">×</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Login Form */}
        <Card>
          <CardHeader>
            <CardTitle>Login Test</CardTitle>
            <CardDescription>Test existing user login</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="test@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="password"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Test Login
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Register Form */}
        <Card>
          <CardHeader>
            <CardTitle>Registration Test</CardTitle>
            <CardDescription>Test new user registration</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor="reg-firstname">First Name</Label>
                  <Input
                    id="reg-firstname"
                    value={registerData.firstName}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, firstName: e.target.value }))}
                    placeholder="John"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="reg-lastname">Last Name</Label>
                  <Input
                    id="reg-lastname"
                    value={registerData.lastName}
                    onChange={(e) => setRegisterData(prev => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="reg-email">Email</Label>
                <Input
                  id="reg-email"
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="newuser@example.com"
                  required
                />
              </div>
              <div>
                <Label htmlFor="reg-username">Username (optional)</Label>
                <Input
                  id="reg-username"
                  value={registerData.username}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="Will use email prefix if empty"
                />
              </div>
              <div>
                <Label htmlFor="reg-password">Password</Label>
                <Input
                  id="reg-password"
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="At least 6 characters"
                  required
                />
              </div>
              <Button type="submit" className="w-full">
                Test Registration
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* API Test Section */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Backend Connection Test</CardTitle>
          <CardDescription>Test if backend is running and accessible</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p><strong>Backend URL:</strong> http://localhost:3000</p>
            <p><strong>Auth Endpoints:</strong></p>
            <ul className="list-disc list-inside ml-4 space-y-1 text-sm">
              <li>POST /api/auth/login - User login</li>
              <li>POST /api/auth/register - User registration</li>
              <li>GET /api/auth/profile - Get user profile</li>
            </ul>
            <div className="mt-4">
              <Button 
                onClick={() => window.open('http://localhost:3000/health', '_blank')}
                variant="outline"
                size="sm"
              >
                Test Backend Health Check
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
