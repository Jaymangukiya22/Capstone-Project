import { useState, useEffect } from 'react'
import { categoryService } from '@/services'
import { questionBankService } from '@/services/questionBankService'

export function DebugPanel() {
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [loading, setLoading] = useState(false)

  const testAPIs = async () => {
    setLoading(true)
    const results: any = {}

    try {
      // Test category API
      console.log('🔍 Testing Category API...')
      const categoryResponse = await categoryService.getAllCategories({
        hierarchy: true,
        depth: 5,
        limit: 1000
      })
      results.categories = {
        success: true,
        data: categoryResponse,
        count: categoryResponse.categories?.length || 0
      }
      console.log('✅ Category API Success:', categoryResponse)
    } catch (error) {
      results.categories = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.error('❌ Category API Error:', error)
    }

    try {
      // Test question bank API
      console.log('🔍 Testing Question Bank API...')
      const questionResponse = await questionBankService.getAllQuestions()
      results.questions = {
        success: true,
        data: questionResponse,
        count: questionResponse.questions?.length || 0
      }
      console.log('✅ Question Bank API Success:', questionResponse)
    } catch (error) {
      results.questions = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
      console.error('❌ Question Bank API Error:', error)
    }

    setDebugInfo(results)
    setLoading(false)
  }

  useEffect(() => {
    testAPIs()
  }, [])

  return (
    <div className="fixed top-4 right-4 w-96 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 z-50 max-h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🔍 API Debug Panel</h3>
        <button
          onClick={testAPIs}
          disabled={loading}
          className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-4">
        {/* Category API Status */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
          <h4 className="font-medium mb-2">📁 Category API</h4>
          {debugInfo.categories ? (
            <div>
              <div className={`text-sm ${debugInfo.categories.success ? 'text-green-600' : 'text-red-600'}`}>
                Status: {debugInfo.categories.success ? '✅ Success' : '❌ Failed'}
              </div>
              {debugInfo.categories.success ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Categories found: {debugInfo.categories.count}
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  Error: {debugInfo.categories.error}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
        </div>

        {/* Question Bank API Status */}
        <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
          <h4 className="font-medium mb-2">❓ Question Bank API</h4>
          {debugInfo.questions ? (
            <div>
              <div className={`text-sm ${debugInfo.questions.success ? 'text-green-600' : 'text-red-600'}`}>
                Status: {debugInfo.questions.success ? '✅ Success' : '❌ Failed'}
              </div>
              {debugInfo.questions.success ? (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Questions found: {debugInfo.questions.count}
                </div>
              ) : (
                <div className="text-sm text-red-600">
                  Error: {debugInfo.questions.error}
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500">Loading...</div>
          )}
        </div>

        {/* Raw Data Preview */}
        {debugInfo.categories?.success && (
          <div className="border border-gray-200 dark:border-gray-700 rounded p-3">
            <h4 className="font-medium mb-2">📊 Category Data Preview</h4>
            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded overflow-x-auto">
              {JSON.stringify(debugInfo.categories.data.categories?.slice(0, 2), null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
