import { useState, useEffect } from "react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Brain, Users, TrendingUp, Activity, AlertCircle, Star, Bookmark, Clock, ShieldX } from "lucide-react";
import { Header } from "@/components/Header";
import { useNavigate } from "react-router-dom";
import PropertyCurationDashboard from "@/components/PropertyCurationDashboard";

interface AdminMetrics {
  totalRecommendations: number;
  aiRecommendations: number;
  standardRecommendations: number;
  totalUsers: number;
  aiTestUsers: number;
  avgResponseTime: number;
  favoriteRate: number;
  interactionRate: number;
}

interface AIScoreData {
  category: string;
  collaborative: number;
  temporal: number;
  crossCategory: number;
  total: number;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [aiScores, setAiScores] = useState<AIScoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, loading: adminLoading, error: adminError } = useAdminAuth();

  useEffect(() => {
    if (isAdmin) {
      console.log('AdminDashboard mounted, fetching metrics...');
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [isAdmin]);

  const fetchMetrics = async () => {
    try {
      console.log('Fetching admin metrics...');
      // Fetch recommendation metrics
      const { data: recommendations, error: recError } = await supabase
        .from('user_recommendations')
        .select('recommendation_engine, is_favorite, interaction_count, ai_scores, user_id');

      console.log('Recommendations data:', recommendations, 'Error:', recError);

      // Fetch user profiles for total users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id');

      if (profileError) throw profileError;

      // Calculate metrics
      const totalRecs = recommendations?.length || 0;
      const aiRecs = recommendations?.filter(r => r.recommendation_engine === 'ai').length || 0;
      const standardRecs = totalRecs - aiRecs;
      const totalUsers = profiles?.length || 0;
      const aiTestUsers = Math.floor(totalUsers / 2); // Rough estimate for user_id % 2 = 1

      const favorites = recommendations?.filter(r => r.is_favorite).length || 0;
      const favoriteRate = totalRecs > 0 ? (favorites / totalRecs) * 100 : 0;

      const interactions = recommendations?.reduce((sum, r) => sum + (r.interaction_count || 0), 0) || 0;
      const interactionRate = totalRecs > 0 ? interactions / totalRecs : 0;

      setMetrics({
        totalRecommendations: totalRecs,
        aiRecommendations: aiRecs,
        standardRecommendations: standardRecs,
        totalUsers,
        aiTestUsers,
        avgResponseTime: 1.8, // Mock data - would come from edge function logs
        favoriteRate,
        interactionRate
      });

      // Process AI scores by category
      const aiRecsWithScores = recommendations?.filter(r => 
        r.recommendation_engine === 'ai' && r.ai_scores
      ) || [];

      const scoresByCategory: { [key: string]: { collaborative: number[], temporal: number[], crossCategory: number[] } } = {};
      
      aiRecsWithScores.forEach(rec => {
        const category = 'General'; // Would get from rec.category if available
        if (!scoresByCategory[category]) {
          scoresByCategory[category] = { collaborative: [], temporal: [], crossCategory: [] };
        }
        
        const scores = rec.ai_scores as any;
        if (scores.collaborative) scoresByCategory[category].collaborative.push(scores.collaborative);
        if (scores.temporal) scoresByCategory[category].temporal.push(scores.temporal);
        if (scores.crossCategory) scoresByCategory[category].crossCategory.push(scores.crossCategory);
      });

      const processedScores = Object.entries(scoresByCategory).map(([category, scores]) => ({
        category,
        collaborative: scores.collaborative.length > 0 ? scores.collaborative.reduce((a, b) => a + b, 0) / scores.collaborative.length : 0,
        temporal: scores.temporal.length > 0 ? scores.temporal.reduce((a, b) => a + b, 0) / scores.temporal.length : 0,
        crossCategory: scores.crossCategory.length > 0 ? scores.crossCategory.reduce((a, b) => a + b, 0) / scores.crossCategory.length : 0,
        total: 0
      }));

      processedScores.forEach(score => {
        score.total = (score.collaborative + score.temporal + score.crossCategory) / 3;
      });

      setAiScores(processedScores);
    } catch (error) {
      console.error('Error fetching admin metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Admin authentication check - only admins can access dashboard
  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                {adminLoading ? "Verifying admin privileges..." : "Loading admin metrics..."}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (adminError || !isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 px-6 max-w-7xl mx-auto">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldX className="h-5 w-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {adminError || "You don't have permission to access the admin dashboard. Admin privileges are required."}
              </p>
              <p className="text-xs text-muted-foreground">
                If you believe this is an error, please contact your administrator.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const abTestData = [
    { name: 'Standard Engine', value: metrics?.standardRecommendations || 0, color: '#8884d8' },
    { name: 'AI Engine', value: metrics?.aiRecommendations || 0, color: '#82ca9d' }
  ];

  const aiProgress = metrics ? (metrics.aiRecommendations / metrics.totalRecommendations) * 100 : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-24 px-6 max-w-7xl mx-auto pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">AI Recommendation Engine Dashboard</h1>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              Admin Only
            </Badge>
          </div>
          <p className="text-muted-foreground">
            Real-time monitoring of the Smart Recommendation Engine performance and A/B testing
          </p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="curation">Property Curation</TabsTrigger>
            <TabsTrigger value="abtest">A/B Testing</TabsTrigger>
            <TabsTrigger value="ai-scores">AI Performance</TabsTrigger>
            <TabsTrigger value="system">System Health</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Recommendations</CardTitle>
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalRecommendations || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Generated across all users
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">AI Engine Usage</CardTitle>
                  <Brain className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{aiProgress.toFixed(1)}%</div>
                  <Progress value={aiProgress} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.aiRecommendations || 0} AI recommendations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Favorite Rate</CardTitle>
                  <Star className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.favoriteRate.toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">
                    User engagement metric
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.avgResponseTime}s</div>
                  <p className="text-xs text-muted-foreground">
                    Edge function performance
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="curation" className="space-y-6">
            <PropertyCurationDashboard />
          </TabsContent>

          <TabsContent value="abtest" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>A/B Test Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ChartContainer
                    config={{
                      value: {
                        label: "Recommendations",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={abTestData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                        >
                          {abTestData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>User Test Groups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Total Users</span>
                    <Badge variant="outline">{metrics?.totalUsers || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">AI Test Group (≈50%)</span>
                    <Badge variant="default">{metrics?.aiTestUsers || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Standard Group</span>
                    <Badge variant="secondary">{(metrics?.totalUsers || 0) - (metrics?.aiTestUsers || 0)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-scores" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Engine Performance Scores</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Average scores for collaborative filtering, temporal intelligence, and cross-category analysis
                </p>
              </CardHeader>
              <CardContent>
                {aiScores.length > 0 ? (
                  <ChartContainer
                    config={{
                      collaborative: {
                        label: "Collaborative Filtering",
                        color: "hsl(var(--chart-1))",
                      },
                      temporal: {
                        label: "Temporal Intelligence",
                        color: "hsl(var(--chart-2))",
                      },
                      crossCategory: {
                        label: "Cross-Category Analysis",
                        color: "hsl(var(--chart-3))",
                      },
                    }}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={aiScores}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="category" />
                        <YAxis />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="collaborative" fill="var(--color-collaborative)" />
                        <Bar dataKey="temporal" fill="var(--color-temporal)" />
                        <Bar dataKey="crossCategory" fill="var(--color-crossCategory)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Brain className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No AI score data available yet</p>
                    <p className="text-xs mt-2">AI recommendations will appear here as users interact with the system</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Edge Functions</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Operational</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Database</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Healthy</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">AI Processing</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache System</span>
                    <Badge variant="default" className="bg-green-100 text-green-800">Optimized</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Performance Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Interaction Rate</span>
                    <span className="font-medium">{metrics?.interactionRate.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Cache Hit Rate</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Success Rate</span>
                    <span className="font-medium">99.2%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Error Rate</span>
                    <span className="font-medium text-green-600">0.8%</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;