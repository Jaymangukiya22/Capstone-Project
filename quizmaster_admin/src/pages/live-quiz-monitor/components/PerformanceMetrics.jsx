import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Icon from '../../../components/AppIcon';

const PerformanceMetrics = ({ metrics, className = '' }) => {
  const responseTimeData = [
    { time: '10:00', avgTime: 12.5, accuracy: 85 },
    { time: '10:05', avgTime: 11.8, accuracy: 87 },
    { time: '10:10', avgTime: 13.2, accuracy: 82 },
    { time: '10:15', avgTime: 10.9, accuracy: 89 },
    { time: '10:20', avgTime: 12.1, accuracy: 86 },
    { time: '10:25', avgTime: 11.5, accuracy: 88 },
  ];

  const questionDifficultyData = [
    { difficulty: 'Easy', correct: 45, incorrect: 5 },
    { difficulty: 'Medium', correct: 32, incorrect: 18 },
    { difficulty: 'Hard', correct: 18, incorrect: 32 },
  ];

  const playerEngagementData = [
    { name: 'Highly Engaged', value: 35, color: '#10B981' },
    { name: 'Moderately Engaged', value: 40, color: '#F59E0B' },
    { name: 'Low Engagement', value: 20, color: '#EF4444' },
    { name: 'Disconnected', value: 5, color: '#6B7280' },
  ];

  const formatPercentage = (value) => `${value}%`;
  const formatTime = (value) => `${value}s`;

  return (
    <div className={`bg-card border border-border rounded-lg p-6 shadow-elevation-1 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-card-foreground">Performance Metrics</h3>
        <div className="flex items-center space-x-2">
          <Icon name="TrendingUp" size={16} className="text-success" />
          <span className="text-sm text-success font-medium">Live Analytics</span>
        </div>
      </div>
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-primary/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Target" size={16} className="text-primary" />
            <span className="text-sm font-medium text-muted-foreground">Overall Accuracy</span>
          </div>
          <p className="text-2xl font-bold text-primary">{metrics?.overallAccuracy}%</p>
          <p className="text-xs text-muted-foreground">
            {metrics?.accuracyTrend > 0 ? '↑' : '↓'} {Math.abs(metrics?.accuracyTrend)}% from last session
          </p>
        </div>

        <div className="bg-secondary/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Clock" size={16} className="text-secondary" />
            <span className="text-sm font-medium text-muted-foreground">Avg Response Time</span>
          </div>
          <p className="text-2xl font-bold text-secondary">{metrics?.avgResponseTime}s</p>
          <p className="text-xs text-muted-foreground">
            {metrics?.responseTimeTrend > 0 ? '↑' : '↓'} {Math.abs(metrics?.responseTimeTrend)}s from target
          </p>
        </div>

        <div className="bg-success/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Users" size={16} className="text-success" />
            <span className="text-sm font-medium text-muted-foreground">Retention Rate</span>
          </div>
          <p className="text-2xl font-bold text-success">{metrics?.retentionRate}%</p>
          <p className="text-xs text-muted-foreground">
            {metrics?.retentionTrend > 0 ? '↑' : '↓'} {Math.abs(metrics?.retentionTrend)}% retention
          </p>
        </div>

        <div className="bg-warning/10 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Icon name="Zap" size={16} className="text-warning" />
            <span className="text-sm font-medium text-muted-foreground">Engagement Score</span>
          </div>
          <p className="text-2xl font-bold text-warning">{metrics?.engagementScore}</p>
          <p className="text-xs text-muted-foreground">
            {metrics?.engagementTrend > 0 ? '↑' : '↓'} {Math.abs(metrics?.engagementTrend)} points
          </p>
        </div>
      </div>
      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Response Time & Accuracy Trend */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Response Time & Accuracy Trend</h4>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="time" 
                  stroke="var(--color-text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="time"
                  stroke="var(--color-text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  yAxisId="accuracy"
                  orientation="right"
                  stroke="var(--color-text-secondary)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  yAxisId="time"
                  type="monotone" 
                  dataKey="avgTime" 
                  stroke="var(--color-secondary)" 
                  strokeWidth={2}
                  name="Avg Response Time (s)"
                />
                <Line 
                  yAxisId="accuracy"
                  type="monotone" 
                  dataKey="accuracy" 
                  stroke="var(--color-primary)" 
                  strokeWidth={2}
                  name="Accuracy (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Question Difficulty Performance */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Performance by Difficulty</h4>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={questionDifficultyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis 
                  dataKey="difficulty" 
                  stroke="var(--color-text-secondary)"
                  fontSize={12}
                />
                <YAxis 
                  stroke="var(--color-text-secondary)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="correct" fill="var(--color-success)" name="Correct" />
                <Bar dataKey="incorrect" fill="var(--color-error)" name="Incorrect" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player Engagement Distribution */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Player Engagement Distribution</h4>
          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={playerEngagementData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {playerEngagementData?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry?.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--color-popover)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {playerEngagementData?.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item?.color }}
                ></div>
                <span className="text-xs text-muted-foreground">{item?.name}: {item?.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Statistics */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-card-foreground mb-3">Real-time Statistics</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Questions Answered</span>
              <span className="text-sm font-medium text-card-foreground">{metrics?.questionsAnswered}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Response Time</span>
              <span className="text-sm font-medium text-card-foreground">{metrics?.totalResponseTime}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Fastest Response</span>
              <span className="text-sm font-medium text-success">{metrics?.fastestResponse}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Slowest Response</span>
              <span className="text-sm font-medium text-error">{metrics?.slowestResponse}s</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Perfect Scores</span>
              <span className="text-sm font-medium text-primary">{metrics?.perfectScores}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Streak Leaders</span>
              <span className="text-sm font-medium text-secondary">{metrics?.streakLeaders}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;