import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Calendar, TrendingUp, Users, MousePointer, Heart, Eye, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  avgSessionDuration: number;
  totalPageViews: number;
  totalClicks: number;
  totalFavorites: number;
  cacheHitRate: number;
}

interface CategoryData {
  category: string;
  views: number;
  clicks: number;
  favorites: number;
  clickThroughRate: number;
}

interface DailyStats {
  date: string;
  users: number;
  sessions: number;
  pageViews: number;
  clicks: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function Analytics() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7');
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Simple authentication check - redirect if not logged in
  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Access Restricted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>Please log in to access the analytics dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days));
      const endDate = endOfDay(new Date());

      // Fetch overall metrics
      const { data: sessionsData } = await supabase
        .from('user_sessions')
        .select('*')
        .gte('started_at', startDate.toISOString())
        .lte('started_at', endDate.toISOString());

      const { data: eventsData } = await supabase
        .from('user_activity_events')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Calculate metrics
      const totalUsers = new Set(eventsData?.map(e => e.user_id).filter(Boolean)).size;
      const activeUsers = new Set(
        eventsData?.filter(e => e.created_at >= subDays(new Date(), 1).toISOString())
          .map(e => e.user_id).filter(Boolean)
      ).size;

      const totalSessions = sessionsData?.length || 0;
      const avgSessionDuration = sessionsData?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) / totalSessions || 0;
      const totalPageViews = eventsData?.filter(e => e.event_type === 'page_view').length || 0;
      const totalClicks = eventsData?.filter(e => e.event_type === 'recommendation_click').length || 0;
      const totalFavorites = eventsData?.filter(e => e.event_type === 'favorite_added').length || 0;

      // Get cache stats from local storage
      const cacheStats = JSON.parse(localStorage.getItem('apiCostStats') || '{"cacheHits": 0, "totalRequests": 1}');
      const cacheHitRate = (cacheStats.cacheHits / cacheStats.totalRequests) * 100;

      setMetrics({
        totalUsers,
        activeUsers,
        totalSessions,
        avgSessionDuration: Math.round(avgSessionDuration),
        totalPageViews,
        totalClicks,
        totalFavorites,
        cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      });

      // Process category data
      const categoryMap = new Map<string, { views: number; clicks: number; favorites: number }>();
      
      eventsData?.forEach(event => {
        const eventData = event.event_data as any;
        const category = eventData?.category || 'Unknown';
        if (!categoryMap.has(category)) {
          categoryMap.set(category, { views: 0, clicks: 0, favorites: 0 });
        }
        
        const categoryStats = categoryMap.get(category)!;
        switch (event.event_type) {
          case 'page_view':
            categoryStats.views++;
            break;
          case 'recommendation_click':
            categoryStats.clicks++;
            break;
          case 'favorite_added':
            categoryStats.favorites++;
            break;
        }
      });

      const categoryDataArray = Array.from(categoryMap.entries()).map(([category, stats]) => ({
        category,
        views: stats.views,
        clicks: stats.clicks,
        favorites: stats.favorites,
        clickThroughRate: stats.views > 0 ? Math.round((stats.clicks / stats.views) * 10000) / 100 : 0,
      })).sort((a, b) => b.views - a.views);

      setCategoryData(categoryDataArray);

      // Process daily stats
      const dailyMap = new Map<string, { users: Set<string>; sessions: number; pageViews: number; clicks: number }>();
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap.set(date, { users: new Set(), sessions: 0, pageViews: 0, clicks: 0 });
      }

      eventsData?.forEach(event => {
        const date = format(new Date(event.created_at), 'yyyy-MM-dd');
        const dayStats = dailyMap.get(date);
        if (dayStats) {
          if (event.user_id) dayStats.users.add(event.user_id);
          if (event.event_type === 'page_view') dayStats.pageViews++;
          if (event.event_type === 'recommendation_click') dayStats.clicks++;
        }
      });

      sessionsData?.forEach(session => {
        const date = format(new Date(session.started_at), 'yyyy-MM-dd');
        const dayStats = dailyMap.get(date);
        if (dayStats) {
          dayStats.sessions++;
        }
      });

      const dailyStatsArray = Array.from(dailyMap.entries()).map(([date, stats]) => ({
        date: format(new Date(date), 'MMM dd'),
        users: stats.users.size,
        sessions: stats.sessions,
        pageViews: stats.pageViews,
        clicks: stats.clicks,
      })).reverse();

      setDailyStats(dailyStatsArray);

    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Failed to fetch analytics: ${errorMessage}`);
      toast({
        title: "Error fetching analytics",
        description: "Failed to load analytics data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    // Aggregate today's data
    try {
      await supabase.rpc('aggregate_daily_analytics');
      await fetchAnalytics();
      toast({
        title: "Data refreshed",
        description: "Analytics data has been updated with the latest information.",
      });
    } catch (error) {
      console.error('Failed to refresh data:', error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh analytics data.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Error Loading Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => { setError(null); fetchAnalytics(); }}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive user behavior and system performance insights</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last 24h</SelectItem>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.activeUsers} active in last 24h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessions</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalSessions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.avgSessionDuration}s avg duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Page Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalPageViews.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalClicks} recommendation clicks
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Efficiency</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.cacheHitRate}%</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.totalFavorites} favorites added
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="engagement">User Engagement</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity</CardTitle>
                <CardDescription>User activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dailyStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="users" stroke="#8884d8" name="Users" />
                    <Line type="monotone" dataKey="sessions" stroke="#82ca9d" name="Sessions" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Categories</CardTitle>
                <CardDescription>Most viewed content categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryData.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="views"
                      label={({ category, views }) => `${category}: ${views}`}
                    >
                      {categoryData.slice(0, 6).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Category Performance</CardTitle>
              <CardDescription>Detailed breakdown of user interactions by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryData.map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-4 h-4 rounded"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div>
                        <h3 className="font-medium">{category.category}</h3>
                        <div className="flex gap-4 text-sm text-muted-foreground">
                          <span>{category.views} views</span>
                          <span>{category.clicks} clicks</span>
                          <span>{category.favorites} favorites</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={category.clickThroughRate > 5 ? "default" : "secondary"}>
                        {category.clickThroughRate}% CTR
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>Page views vs. recommendation clicks over time</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="pageViews" fill="#8884d8" name="Page Views" />
                  <Bar dataKey="clicks" fill="#82ca9d" name="Clicks" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="engagement">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Click-Through Rates</CardTitle>
                <CardDescription>How often users click on recommendations</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={categoryData.slice(0, 8)} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="clickThroughRate" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User Engagement Metrics</CardTitle>
                <CardDescription>Overall platform engagement statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Interactions</span>
                  <span className="font-medium">{(metrics?.totalClicks || 0) + (metrics?.totalFavorites || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Clicks per Session</span>
                  <span className="font-medium">
                    {metrics?.totalSessions ? Math.round(((metrics?.totalClicks || 0) / metrics.totalSessions) * 100) / 100 : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Favorites per User</span>
                  <span className="font-medium">
                    {metrics?.totalUsers ? Math.round(((metrics?.totalFavorites || 0) / metrics.totalUsers) * 100) / 100 : 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Pages per Session</span>
                  <span className="font-medium">
                    {metrics?.totalSessions ? Math.round(((metrics?.totalPageViews || 0) / metrics.totalSessions) * 100) / 100 : 0}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}