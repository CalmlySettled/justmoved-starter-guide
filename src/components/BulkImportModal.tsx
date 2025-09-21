import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  propertyId: string;
  onImportComplete: () => void;
}

const BulkImportModal: React.FC<BulkImportModalProps> = ({
  isOpen,
  onClose,
  propertyId,
  onImportComplete
}) => {
  const [csvData, setCsvData] = useState('');
  const [importing, setImporting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('comprehensive');

  const templates = {
    comprehensive: {
      name: 'Comprehensive (All Categories)',
      description: 'Complete template with examples from all business categories',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Starbucks,restaurants,"123 Main St, Hartford, CT",+1-555-123-4567,https://starbucks.com,4.2,Popular coffee chain with WiFi and pastries,Drive-through|Local Chain,Free WiFi|Drive-through|Loyalty Program
Stop & Shop,grocery stores,"456 Park Ave, Hartford, CT",+1-555-987-6543,https://stopandshop.com,4.0,Full-service grocery store with pharmacy,Budget Friendly|Pharmacy,Free Parking|Pharmacy|Online Ordering
Planet Fitness,gyms,"789 Elm St, Hartford, CT",+1-555-456-7890,https://planetfitness.com,4.1,24-hour gym with modern equipment,24 Hour|Budget Friendly,24 Hour Service|Air Conditioning|Free Parking
Chase Bank,banks,"321 Oak St, Hartford, CT",+1-555-234-5678,https://chase.com,4.3,Full-service bank with ATM and drive-through,Drive-through|ATM Available,Drive-through|ATM|Online Banking|Safe Deposit Boxes
CVS Pharmacy,medical,"654 Pine St, Hartford, CT",+1-555-345-6789,https://cvs.com,4.0,Pharmacy with photo services and convenience items,24 Hour|Drive-through,24 Hour Service|Drive-through|Photo Services|Pharmacy
Hartford DMV,government services,"987 Cedar St, Hartford, CT",+1-555-456-7890,https://ct.gov/dmv,3.8,Department of Motor Vehicles services,Appointments Available,Appointments Available|Parking Available|Online Services
Hartford Public Library,libraries,"147 Maple St, Hartford, CT",+1-555-567-8901,https://hplct.org,4.5,Public library with community programs and WiFi,Free WiFi|Community Programs,Free WiFi|Computer Access|Study Rooms|Community Programs
Supercuts,beauty salons,"258 Birch St, Hartford, CT",+1-555-678-9012,https://supercuts.com,3.9,Quick service hair salon with walk-ins welcome,Walk-ins Welcome|Budget Friendly,Walk-ins Welcome|Air Conditioning|Credit Cards Accepted
Little Angels Daycare,childcare,"369 Walnut St, Hartford, CT",+1-555-789-0123,https://littleangels.com,4.6,Licensed daycare with educational programs,Licensed|Educational Programs,Licensed|Educational Programs|Outdoor Play|Healthy Meals
VCA Animal Hospital,pet services,"741 Spruce St, Hartford, CT",+1-555-890-1234,https://vcahospitals.com,4.3,Full-service veterinary hospital,Emergency Services|Boarding,Emergency Services|Boarding|Grooming|Surgery`
    },
    urban: {
      name: 'Urban Area Template',
      description: 'Businesses typical for dense urban environments',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Metro Market,grocery stores,"123 Downtown Ave, Hartford, CT",+1-555-123-4567,https://metromarket.com,4.3,Urban grocery with organic options,Organic|Local,Organic Options|Local Products|Delivery|24 Hour
Fitness First,gyms,"456 Main St, Hartford, CT",+1-555-987-6543,https://fitnessfirst.com,4.1,Modern gym with classes,Group Classes|Personal Training,Group Classes|Personal Training|Sauna|Parking
City DMV,government services,"789 State St, Hartford, CT",+1-555-456-7890,https://ct.gov/dmv,3.9,Department of Motor Vehicles,Appointments Required,Appointments Required|Online Services|Parking
Trinity Church,faith communities,"321 Church St, Hartford, CT",+1-555-234-5678,https://trinitychurch.org,4.5,Historic church with community programs,Historic|Community Programs,Historic|Community Programs|Wheelchair Accessible|Parking
Metro Transit Hub,public transit,"654 Transit Way, Hartford, CT",+1-555-345-6789,https://cttransit.com,4.0,Main bus and train connections,Bus|Train,Bus|Train|Real-time Updates|Covered Waiting|Parking`
    },
    suburban: {
      name: 'Suburban Area Template', 
      description: 'Family-friendly businesses common in suburban areas',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Fresh Market,grocery stores,"456 Suburb Ave, West Hartford, CT",+1-555-987-6543,https://freshmarket.com,4.2,Family grocery store with local produce,Family Friendly|Local Produce,Family Friendly|Local Produce|Free Parking|Deli Counter
Planet Fitness,gyms,"789 Wellness Dr, West Hartford, CT",+1-555-456-7890,https://planetfitness.com,4.0,Budget-friendly family gym,Budget Friendly|Family Friendly,Budget Friendly|Family Friendly|Childcare|Pool
Bright Beginnings Daycare,childcare,"321 Family St, West Hartford, CT",+1-555-234-5678,https://brightbeginnings.com,4.6,Licensed daycare with playground,Licensed|Playground,Licensed|Playground|Educational Programs|Healthy Meals
West Hartford Library,libraries,"654 Knowledge Ave, West Hartford, CT",+1-555-345-6789,https://westhartfordlibrary.org,4.7,Community library with children's programs,Children Programs|Free WiFi,Children Programs|Free WiFi|Study Rooms|Community Events
Suburban Medical Center,medical,"987 Health Way, West Hartford, CT",+1-555-456-7890,https://suburbanmedical.com,4.4,Family practice and urgent care,Family Practice|Urgent Care,Family Practice|Urgent Care|Insurance Accepted|Ample Parking`
    },
    essentials: {
      name: 'Essential Services Only',
      description: 'Core essential businesses every area needs',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Local Grocery,grocery stores,"Main St, Your City, CT",+1-555-000-0000,,4.0,Essential grocery shopping,Budget Friendly,Free Parking|Essential Items
Corner Pharmacy,medical,"Main St, Your City, CT",+1-555-000-0001,,4.1,Prescription and health essentials,Essential Services,Pharmacy|Health Items
Community Bank,banks,"Downtown, Your City, CT",+1-555-000-0003,,4.2,Banking and ATM services,Essential Services,ATM|Basic Banking
Medical Center,medical,"Medical District, Your City, CT",+1-555-000-0004,,4.3,Primary healthcare services,Essential Services,Primary Care|Emergency Services`
    }
  };

  const getCurrentTemplate = () => templates[selectedTemplate as keyof typeof templates];

  const downloadTemplate = () => {
    const template = getCurrentTemplate();
    const blob = new Blob([template.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `business_import_${selectedTemplate}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const validateCsvData = (data: string): string[] => {
    const errors: string[] = [];
    const lines = data.trim().split('\n');
    
    if (lines.length < 2) {
      errors.push('CSV must contain at least a header row and one data row');
      return errors;
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const requiredHeaders = ['Business Name', 'Category', 'Address'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        errors.push(`Missing required column: ${required}`);
      }
    }

    // Validate data rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/"/g, ''));
      if (row.length !== headers.length) {
        errors.push(`Row ${i + 1}: Column count mismatch`);
      }
      
      const businessName = row[headers.indexOf('Business Name')];
      const category = row[headers.indexOf('Category')];
      
      if (!businessName) {
        errors.push(`Row ${i + 1}: Business Name is required`);
      }
      if (!category) {
        errors.push(`Row ${i + 1}: Category is required`);
      }
    }

    return errors;
  };

  const parseCsvRow = (row: string[], headers: string[]) => {
    const getValue = (header: string) => {
      const index = headers.indexOf(header);
      return index >= 0 ? row[index] : '';
    };

    const parseArrayField = (value: string) => {
      return value ? value.split('|').map(v => v.trim()).filter(v => v) : [];
    };

    return {
      business_name: getValue('Business Name'),
      category: getValue('Category').toLowerCase(),
      business_address: getValue('Address'),
      business_phone: getValue('Phone') || null,
      business_website: getValue('Website') || null,
      rating: parseFloat(getValue('Rating')) || null,
      business_description: getValue('Description') || null,
      subfilter_tags: parseArrayField(getValue('Subfilter Tags (pipe separated)')),
      business_features: parseArrayField(getValue('Features (pipe separated)')),
      property_id: propertyId,
      is_active: true,
      sort_order: 0
    };
  };

  const handleImport = async () => {
    const errors = validateCsvData(csvData);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    setImporting(true);
    setValidationErrors([]);

    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
      const dataRows = lines.slice(1);

      const businesses = dataRows.map(line => {
        const row = line.split(',').map(cell => cell.trim().replace(/"/g, ''));
        return parseCsvRow(row, headers);
      });

      // Batch geocode addresses
      const geocodingPromises = businesses.map(async (business) => {
        if (business.business_address) {
          try {
            const { data } = await supabase.functions.invoke('geocode-address', {
              body: { address: business.business_address }
            });
            return {
              ...business,
              latitude: data?.lat || null,
              longitude: data?.lng || null
            };
          } catch (error) {
            console.error('Geocoding error for', business.business_name, error);
            return business;
          }
        }
        return business;
      });

      const businessesWithCoordinates = await Promise.all(geocodingPromises);

      // Insert all businesses
      const { error } = await supabase
        .from('curated_property_places')
        .insert(businessesWithCoordinates);

      if (error) throw error;

      toast.success(`Successfully imported ${businesses.length} businesses`);
      onImportComplete();
      onClose();
    } catch (error) {
      console.error('Error importing businesses:', error);
      toast.error('Failed to import businesses');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvData(content);
        setValidationErrors([]);
      };
      reader.readAsText(file);
    } else {
      toast.error('Please select a CSV file');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Import Businesses
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <h3 className="font-medium">Download Template</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a template that matches your area type for faster curation.
                </p>
                <div className="flex gap-2 mt-3">
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Select template type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(templates).map(([key, template]) => (
                        <SelectItem key={key} value={key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {getCurrentTemplate().description}
                </p>
              </div>
            </div>
          </Card>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="csv-file">Upload CSV File</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
            />
          </div>

          {/* Manual CSV Input */}
          <div className="space-y-2">
            <Label htmlFor="csv-data">Or Paste CSV Data</Label>
            <Textarea
              id="csv-data"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste your CSV data here..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Card className="p-4 border-destructive">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-1" />
                <div>
                  <h3 className="font-medium text-destructive">Validation Errors</h3>
                  <ul className="text-sm text-destructive mt-1 space-y-1">
                    {validationErrors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Format Guidelines */}
          <Card className="p-4 bg-muted/50">
            <h3 className="font-medium mb-2">Format Guidelines</h3>
            <ul className="text-sm space-y-1">
              <li>• <strong>Required columns:</strong> Business Name, Category, Address</li>
              <li>• <strong>Categories:</strong> grocery stores, medical, gyms, government services, faith communities, public transit, parks, restaurants, social events, auto services, beauty salons, childcare, banks, pet services, hardware stores, libraries, entertainment</li>
              <li>• <strong>Pipe-separated lists:</strong> Use | to separate multiple tags or features</li>
              <li>• <strong>Phone format:</strong> +1-555-123-4567 (recommended)</li>
              <li>• <strong>Website format:</strong> Include https:// for full URLs</li>
              <li>• <strong>Rating:</strong> Number between 1-5 (e.g., 4.2)</li>
            </ul>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleImport}
            disabled={importing || !csvData.trim() || validationErrors.length > 0}
          >
            {importing ? 'Importing...' : 'Import Businesses'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkImportModal;