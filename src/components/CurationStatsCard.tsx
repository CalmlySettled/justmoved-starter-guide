import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, TrendingUp, CheckCircle2 } from 'lucide-react';

interface CurationStatsCardProps {
  totalCategories: number;
  categoriesWithBusinesses: number;
  totalBusinesses: number;
  businessCounts: Record<string, number>;
}

const CurationStatsCard: React.FC<CurationStatsCardProps> = ({
  totalCategories,
  categoriesWithBusinesses,
  totalBusinesses,
  businessCounts
}) => {
  const completionPercentage = Math.round((categoriesWithBusinesses / totalCategories) * 100);
  
  const emptyCategories = Object.entries(businessCounts)
    .filter(([_, count]) => count === 0)
    .map(([category]) => category);

  const mostPopularCategory = Object.entries(businessCounts)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0)[0];

  return (
    <Card className="border-2">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">Overall Progress</span>
            </div>
            <div className="text-3xl font-bold text-primary">{completionPercentage}%</div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {categoriesWithBusinesses} of {totalCategories} categories
            </p>
          </div>

          {/* Total Businesses */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-secondary" />
              <span className="text-sm font-medium">Total Businesses</span>
            </div>
            <div className="text-3xl font-bold text-secondary">{totalBusinesses}</div>
            <p className="text-xs text-muted-foreground">
              Curated recommendations
            </p>
          </div>

          {/* Most Popular */}
          {mostPopularCategory && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-accent" />
                <span className="text-sm font-medium">Most Popular</span>
              </div>
              <div className="text-xl font-bold text-accent truncate">
                {mostPopularCategory[0]}
              </div>
              <p className="text-xs text-muted-foreground">
                {mostPopularCategory[1]} businesses
              </p>
            </div>
          )}

          {/* Warnings */}
          {emptyCategories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">Needs Attention</span>
              </div>
              <div className="text-3xl font-bold text-destructive">{emptyCategories.length}</div>
              <p className="text-xs text-muted-foreground">
                Empty categories
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default CurationStatsCard;
