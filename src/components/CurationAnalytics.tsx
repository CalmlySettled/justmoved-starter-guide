import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  Target,
  Users,
  Building,
  BarChart3,
  Calendar
} from 'lucide-react';

interface CurationStats {
  totalProperties: number;
  completedProperties: number;
  inProgressProperties: number;
  notStartedProperties: number;
  totalBusinesses: number;
  avgBusinessesPerProperty: number;
  completionRate: number;
  masterTemplates: number;
  categoriesCompleted: number;
  recentActivity: {
    propertiesCompletedThisWeek: number;
    businessesAddedThisWeek: number;
    templatesCreatedThisWeek: number;
  };
}

interface CategoryProgress {
  category: string;
  propertiesWithCategory: number;
  totalProperties: number;
  completionRate: number;
}

const CurationAnalytics: React.FC = () => {
  const [stats, setStats] = useState<CurationStats | null>(null);
  const [categoryProgress, setCategoryProgress] = useState<CategoryProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      // Fetch basic property stats
      const { data: properties } = await supabase
        .from('properties')
        .select(`
          id,
          curation_status,
          total_curated_places,
          is_master_template,
          created_at,
          curation_completed_at
        `);

      // Fetch category completion data
      const { data: categoryData } = await supabase
        .from('curated_property_places')
        .select('property_id, category')
        .eq('is_active', true);

      if (properties) {
        const total = properties.length;
        const completed = properties.filter(p => p.curation_status === 'completed').length;
        const inProgress = properties.filter(p => p.curation_status === 'in_progress').length;
        const notStarted = properties.filter(p => p.curation_status === 'not_started').length;
        const masterTemplates = properties.filter(p => p.is_master_template).length;
        
        const totalBusinesses = properties.reduce((sum, p) => sum + (p.total_curated_places || 0), 0);
        const avgBusinesses = total > 0 ? totalBusinesses / total : 0;

        // Recent activity (last 7 days)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const propertiesCompletedThisWeek = properties.filter(p => 
          p.curation_completed_at && new Date(p.curation_completed_at) >= oneWeekAgo
        ).length;

        // Calculate category progress
        const categories = ['restaurants', 'grocery stores', 'pharmacies', 'gyms', 'banks', 
                          'gas stations', 'coffee shops', 'beauty salons', 'medical', 'shopping'];
        
        const categoryStats = categories.map(category => {
          const propertiesWithCategory = new Set(
            categoryData?.filter(c => c.category === category).map(c => c.property_id) || []
          ).size;
          
          return {
            category,
            propertiesWithCategory,
            totalProperties: completed, // Only count completed properties
            completionRate: completed > 0 ? (propertiesWithCategory / completed) * 100 : 0
          };
        });

        const uniqueCategoriesCompleted = new Set(categoryData?.map(c => c.category) || []).size;

        setStats({
          totalProperties: total,
          completedProperties: completed,
          inProgressProperties: inProgress,
          notStartedProperties: notStarted,
          totalBusinesses,
          avgBusinessesPerProperty: Math.round(avgBusinesses * 10) / 10,
          completionRate: total > 0 ? (completed / total) * 100 : 0,
          masterTemplates,
          categoriesCompleted: uniqueCategoriesCompleted,
          recentActivity: {
            propertiesCompletedThisWeek,
            businessesAddedThisWeek: 0, // Would need more complex query
            templatesCreatedThisWeek: 0 // Would need creation date tracking
          }
        });

        setCategoryProgress(categoryStats);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-muted rounded animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card className="p-6 text-center">
        <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-muted-foreground">No analytics data available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.completionRate)}%</div>
            <Progress value={stats.completionRate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {stats.completedProperties} of {stats.totalProperties} properties
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Businesses</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgBusinessesPerProperty}</div>
            <p className="text-xs text-muted-foreground">per property</p>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.totalBusinesses} total businesses
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Master Templates</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.masterTemplates}</div>
            <p className="text-xs text-muted-foreground">reusable templates</p>
            <div className="text-xs text-muted-foreground mt-2">
              {stats.categoriesCompleted} categories covered
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentActivity.propertiesCompletedThisWeek}</div>
            <p className="text-xs text-muted-foreground">properties completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Property Status Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm">Completed</span>
              </div>
              <Badge variant="default">{stats.completedProperties}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <span className="text-sm">In Progress</span>
              </div>
              <Badge variant="secondary">{stats.inProgressProperties}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Not Started</span>
              </div>
              <Badge variant="outline">{stats.notStartedProperties}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Completion */}
      <Card>
        <CardHeader>
          <CardTitle>Category Completion Rates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categoryProgress
              .sort((a, b) => b.completionRate - a.completionRate)
              .map(category => (
                <div key={category.category} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">
                      {category.category}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {category.propertiesWithCategory}/{category.totalProperties} properties
                    </span>
                  </div>
                  <Progress value={category.completionRate} className="h-2" />
                  <div className="text-xs text-muted-foreground">
                    {Math.round(category.completionRate)}% completion rate
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Efficiency Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Curation Efficiency Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
              <div>
                <strong>Template Usage:</strong> {stats.masterTemplates} master templates available. 
                Using templates can reduce curation time by 60-80%.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
              <div>
                <strong>Category Coverage:</strong> {stats.categoriesCompleted} different categories 
                are being curated across properties.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
              <div>
                <strong>Average Quality:</strong> {stats.avgBusinessesPerProperty} businesses per property 
                indicates good coverage depth.
              </div>
            </div>
            {stats.completionRate < 50 && (
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                <div>
                  <strong>Opportunity:</strong> Completion rate is below 50%. Focus on bulk import 
                  and template copying to accelerate curation.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CurationAnalytics;