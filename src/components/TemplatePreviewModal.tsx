import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Building2, CheckCircle2 } from 'lucide-react';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: {
    id: string;
    property_name: string;
    address: string;
    distance?: number;
    template_category?: string;
    template_description?: string;
    total_curated_places?: number;
  };
  categoryCounts: Record<string, number>;
  onApply: () => void;
  applying: boolean;
}

const TemplatePreviewModal: React.FC<TemplatePreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  categoryCounts,
  onApply,
  applying
}) => {
  const totalBusinesses = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  const categoryCount = Object.keys(categoryCounts).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Template Preview: {template.property_name}
          </DialogTitle>
          <DialogDescription>
            Review the businesses included in this template before applying
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Info */}
          <Card>
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Property Location</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {template.address}
                  </p>
                </div>
                {template.distance !== undefined && (
                  <Badge variant="secondary">
                    {template.distance.toFixed(1)} miles away
                  </Badge>
                )}
              </div>

              {template.template_category && (
                <div>
                  <p className="text-sm font-medium">Template Type</p>
                  <Badge variant="outline" className="mt-1">
                    {template.template_category}
                  </Badge>
                </div>
              )}

              {template.template_description && (
                <div>
                  <p className="text-sm font-medium">Description</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {template.template_description}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-primary">{totalBusinesses}</div>
                <div className="text-sm text-muted-foreground mt-1">Total Businesses</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-secondary">{categoryCount}</div>
                <div className="text-sm text-muted-foreground mt-1">Categories</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-accent">
                  {template.distance !== undefined ? `${template.distance.toFixed(1)}mi` : 'N/A'}
                </div>
                <div className="text-sm text-muted-foreground mt-1">Distance</div>
              </CardContent>
            </Card>
          </div>

          {/* Category Breakdown */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Businesses by Category</h4>
            <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto">
              {Object.entries(categoryCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([category, count]) => (
                  <div
                    key={category}
                    className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
                  >
                    <span className="text-sm font-medium truncate">{category}</span>
                    <Badge variant="secondary" className="ml-2">
                      {count}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>

          {/* Distance Warning */}
          {template.distance !== undefined && template.distance > 20 && (
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                <strong>Note:</strong> This template is {template.distance.toFixed(1)} miles away. 
                You may need to adjust some business addresses and details after applying.
              </p>
            </div>
          )}

          {/* Estimated Time */}
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm">
              <strong>Estimated time to curate from scratch:</strong> {Math.ceil(totalBusinesses * 2 / 60)} hours
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              With this template: ~5 minutes (adjust {Math.ceil(totalBusinesses * 0.1)} businesses)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={onApply} 
            disabled={applying}
            className="flex items-center gap-2"
          >
            {applying ? (
              'Applying Template...'
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Apply Template ({totalBusinesses} businesses)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewModal;
