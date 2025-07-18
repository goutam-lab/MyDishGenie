"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChefHat, Play, CheckCircle, XCircle, AlertCircle, Database } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

interface TestResult {
  success: boolean
  message?: string
  error?: string
  results?: {
    tableStructure: any[]
    userCreated: boolean
    userUpdated: boolean
    userFoundAfterCreation: boolean
    testUserId: string
    testUserEmail: string
  }
  stack?: string
}

export default function TestSignupPage() {
  const [isRunning, setIsRunning] = useState(false)
  const [testResult, setTestResult] = useState<TestResult | null>(null)

  const runSignupTest = async () => {
    setIsRunning(true)
    setTestResult(null)

    try {
      const response = await fetch("/api/test-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: error instanceof Error ? error.message : "Network error occurred",
      })
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (success: boolean) => {
    return success ? <CheckCircle className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-600" />
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-yellow-50 to-red-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <ChefHat className="h-8 w-8 text-orange-600" />
            <span className="text-2xl font-bold text-gray-800">MyDishGenie</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/auth/signup">
              <Button variant="outline">Back to Signup</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="outline">Dashboard</Button>
            </Link>
          </div>
        </nav>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Signup Flow Test</h1>
            <p className="text-gray-600 text-lg">Test the new JSON-only approach for user creation</p>
          </div>

          {/* Test Control */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Database className="h-5 w-5 text-orange-600" />
                <span>Database Signup Test</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-600">
                  This test will verify that the new JSON-only user creation approach works with your existing database
                  structure.
                </p>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-yellow-800">Test Process</h4>
                      <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                        <li>1. Inspect database table structure</li>
                        <li>2. Create test user with JSON-only approach</li>
                        <li>3. Update user with hashed password</li>
                        <li>4. Verify user can be found by email</li>
                        <li>5. Report results (test user will remain for manual cleanup)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={runSignupTest}
                  disabled={isRunning}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {isRunning ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Running Test...</span>
                    </div>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Run Signup Test
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          {testResult && (
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {getStatusIcon(testResult.success)}
                  <span>Test Results</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {testResult.success ? (
                  <div className="space-y-6">
                    <Alert className="border-green-200 bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        <strong>Success!</strong> {testResult.message}
                      </AlertDescription>
                    </Alert>

                    {testResult.results && (
                      <div className="space-y-4">
                        <h4 className="font-semibold text-gray-800">Test Steps Results:</h4>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(testResult.results.userCreated)}
                            <span className="text-sm">User Created</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(testResult.results.userUpdated)}
                            <span className="text-sm">Password Updated</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(testResult.results.userFoundAfterCreation)}
                            <span className="text-sm">User Found by Email</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="text-sm">Database Structure Analyzed</span>
                          </div>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                          <h5 className="font-medium mb-2">Test User Details:</h5>
                          <div className="text-sm space-y-1">
                            <div>
                              <strong>ID:</strong> {testResult.results.testUserId}
                            </div>
                            <div>
                              <strong>Email:</strong> {testResult.results.testUserEmail}
                            </div>
                          </div>
                        </div>

                        {testResult.results.tableStructure && (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <h5 className="font-medium mb-2">Database Table Structure:</h5>
                            <div className="text-xs overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b">
                                    <th className="text-left p-1">Column</th>
                                    <th className="text-left p-1">Type</th>
                                    <th className="text-left p-1">Nullable</th>
                                    <th className="text-left p-1">Default</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {testResult.results.tableStructure.map((col, idx) => (
                                    <tr key={idx} className="border-b">
                                      <td className="p-1 font-mono">{col.column_name}</td>
                                      <td className="p-1">{col.data_type}</td>
                                      <td className="p-1">{col.is_nullable}</td>
                                      <td className="p-1 text-xs">{col.column_default || "None"}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        <strong>Test Failed:</strong> {testResult.error}
                      </AlertDescription>
                    </Alert>

                    {testResult.stack && (
                      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto">
                        <pre>{testResult.stack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">If Test Passes:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Try the actual signup form</li>
                      <li>• Test the complete auth flow</li>
                      <li>• Clean up test users</li>
                      <li>• Deploy to production</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">If Test Fails:</h4>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• Check database permissions</li>
                      <li>• Review table constraints</li>
                      <li>• Consider alternative approaches</li>
                      <li>• Contact database administrator</li>
                    </ul>
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Link href="/auth/signup">
                    <Button className="bg-orange-600 hover:bg-orange-700">Try Real Signup</Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button variant="outline">Go to Dashboard</Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
