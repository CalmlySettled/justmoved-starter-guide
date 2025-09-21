import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Star, StarOff, Building, MapPin, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Property {
  id: string;
  property_name: string;
  address: string;
  curation_status: string;
  total_curated_places: number;
  is_master_template: boolean;
  template_category: string | null;
  template_description: string | null;
}

interface MasterTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateUpdate: () => void;
}

const MasterTemplateModal: React.FC<MasterTemplateModalProps> = ({
  isOpen,
  onClose,
  onTemplateUpdate
}) => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<Property | null>(null);
  const [templateCategory, setTemplateCategory] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProperties();
    }
  }, [isOpen]);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id,
          property_name,
          address,
          curation_status,
          total_curated_places,
          is_master_template,
          template_category,
          template_description
        `)
        .eq('curation_status', 'completed')
        .gte('total_curated_places', 5)
        .order('is_master_template', { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
      toast.error('Failed to load properties');
    } finally {
      setLoading(false);
    }
  };

  const toggleMasterTemplate = async (property: Property) => {
    if (!property.is_master_template) {
      // Making it a master template - show form
      setEditingTemplate(property);
      setTemplateCategory(property.template_category || '');
      setTemplateDescription(property.template_description || '');
    } else {
      // Removing master template status
      try {
        const { error } = await supabase
          .from('properties')
          .update({
            is_master_template: false,
            template_category: null,
            template_description: null
          })
          .eq('id', property.id);

        if (error) throw error;
        
        toast.success('Removed master template status');
        fetchProperties();
        onTemplateUpdate();
      } catch (error) {
        console.error('Error updating template:', error);
        toast.error('Failed to update template');
      }
    }
  };

  const saveMasterTemplate = async () => {
    if (!editingTemplate || !templateCategory.trim()) {
      toast.error('Please provide a template category');
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .update({
          is_master_template: true,
          template_category: templateCategory.trim(),
          template_description: templateDescription.trim() || null
        })
        .eq('id', editingTemplate.id);

      if (error) throw error;
      
      toast.success('Master template created successfully');
      setEditingTemplate(null);
      setTemplateCategory('');
      setTemplateDescription('');
      fetchProperties();
      onTemplateUpdate();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const filteredProperties = properties.filter(property =>
    property.property_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.template_category && property.template_category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const masterTemplates = filteredProperties.filter(p => p.is_master_template);
  const availableProperties = filteredProperties.filter(p => !p.is_master_template);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Master Template Manager
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Search */}
          <div>
            <Label htmlFor="search">Search Properties</Label>
            <Input
              id="search"
              placeholder="Search by name, address, or template category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Master Templates Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Master Templates ({masterTemplates.length})
            </h3>
            <div className="space-y-3">
              {masterTemplates.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <Star className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No master templates created yet.</p>
                  <p className="text-sm">Create templates from well-curated properties below.</p>
                </Card>
              ) : (
                masterTemplates.map(property => (
                  <Card key={property.id} className="p-4 border-yellow-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium">{property.property_name}</h4>
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            {property.template_category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                        {property.template_description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {property.template_description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{property.total_curated_places} businesses</span>
                          <span>{property.curation_status}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMasterTemplate(property)}
                        className="text-yellow-600 hover:text-yellow-700"
                      >
                        <StarOff className="h-4 w-4 mr-1" />
                        Remove Template
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Available Properties Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Building className="h-5 w-5" />
              Well-Curated Properties ({availableProperties.length})
            </h3>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-16 bg-muted rounded animate-pulse" />
                  ))}
                </div>
              ) : availableProperties.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No well-curated properties available.</p>
                  <p className="text-sm">Properties need to be completed with at least 5 businesses.</p>
                </Card>
              ) : (
                availableProperties.map(property => (
                  <Card key={property.id} className="p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{property.property_name}</h4>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>{property.total_curated_places} businesses</span>
                          <span>{property.curation_status}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleMasterTemplate(property)}
                      >
                        <Star className="h-4 w-4 mr-1" />
                        Make Template
                      </Button>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Template Creation Form */}
          {editingTemplate && (
            <Card className="p-4 border-blue-200 bg-blue-50/50">
              <h4 className="font-medium mb-3">Create Master Template: {editingTemplate.property_name}</h4>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="template-category">Template Category *</Label>
                  <Input
                    id="template-category"
                    placeholder="e.g., Urban Downtown, Suburban Family, College Town, etc."
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="template-description">Description (Optional)</Label>
                  <Textarea
                    id="template-description"
                    placeholder="Describe what makes this a good template (area type, business mix, etc.)"
                    value={templateDescription}
                    onChange={(e) => setTemplateDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveMasterTemplate} size="sm">
                    <Star className="h-4 w-4 mr-1" />
                    Create Template
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setEditingTemplate(null);
                      setTemplateCategory('');
                      setTemplateDescription('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Usage Instructions */}
          <Card className="p-4 bg-muted/50">
            <h4 className="font-medium mb-2">How to Use Master Templates</h4>
            <ul className="text-sm space-y-1">
              <li>• <strong>Create Templates:</strong> Mark well-curated properties as master templates</li>
              <li>• <strong>Categorize:</strong> Give each template a clear category (Urban, Suburban, etc.)</li>
              <li>• <strong>Copy Efficiently:</strong> Use "Copy from Property" to duplicate template data</li>
              <li>• <strong>Customize:</strong> Adjust addresses and local businesses after copying</li>
              <li>• <strong>Maintain Quality:</strong> Keep templates updated with the best businesses</li>
            </ul>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MasterTemplateModal;