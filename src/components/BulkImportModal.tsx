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
Starbucks,coffee shops,"123 Main St, Hartford, CT",+1-555-123-4567,https://starbucks.com,4.2,Popular coffee chain with WiFi and pastries,Drive-through|Local Chain,Free WiFi|Drive-through|Loyalty Program
Stop & Shop,grocery stores,"456 Park Ave, Hartford, CT",+1-555-987-6543,https://stopandshop.com,4.0,Full-service grocery store with pharmacy,Budget Friendly|Pharmacy,Free Parking|Pharmacy|Online Ordering
Planet Fitness,gyms,"789 Elm St, Hartford, CT",+1-555-456-7890,https://planetfitness.com,4.1,24-hour gym with modern equipment,24 Hour|Budget Friendly,24 Hour Service|Air Conditioning|Free Parking
Chase Bank,banks,"321 Oak St, Hartford, CT",+1-555-234-5678,https://chase.com,4.3,Full-service bank with ATM and drive-through,Drive-through|ATM Available,Drive-through|ATM|Online Banking|Safe Deposit Boxes
CVS Pharmacy,pharmacies,"654 Pine St, Hartford, CT",+1-555-345-6789,https://cvs.com,4.0,Pharmacy with photo services and convenience items,24 Hour|Drive-through,24 Hour Service|Drive-through|Photo Services|Pharmacy
Shell Gas Station,gas stations,"987 Cedar St, Hartford, CT",+1-555-456-7890,https://shell.com,4.2,Gas station with convenience store and car wash,24 Hour|Car Wash,24 Hour Service|Car Wash|Convenience Store|Air Pump
Olive Garden,restaurants,"147 Maple St, Hartford, CT",+1-555-567-8901,https://olivegarden.com,4.1,Italian restaurant with unlimited breadsticks,Family Friendly|Reservations,Family Friendly|Reservations|Full Bar|Outdoor Seating
Supercuts,beauty salons,"258 Birch St, Hartford, CT",+1-555-678-9012,https://supercuts.com,3.9,Quick service hair salon with walk-ins welcome,Walk-ins Welcome|Budget Friendly,Walk-ins Welcome|Air Conditioning|Credit Cards Accepted
Hartford Medical Group,medical,"369 Walnut St, Hartford, CT",+1-555-789-0123,https://hartfordmedical.com,4.4,Primary care and specialty medical services,Primary Care|Specialists,Primary Care|Specialists|Insurance Accepted|Parking Available
Target,shopping,"741 Spruce St, Hartford, CT",+1-555-890-1234,https://target.com,4.2,Department store with groceries and pharmacy,Pharmacy|Grocery,Pharmacy|Grocery|Free Parking|Online Pickup|Returns Center`
    },
    urban: {
      name: 'Urban Area Template',
      description: 'Businesses typical for dense urban environments',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Blue State Coffee,coffee shops,"Downtown Plaza, Hartford, CT",+1-555-123-4567,https://bluestatecoffee.com,4.5,Local coffee roaster with WiFi and study space,Local|WiFi Available,Free WiFi|Study Space|Local Roaster|Outdoor Seating
Whole Foods Market,grocery stores,"City Center, Hartford, CT",+1-555-987-6543,https://wholefoodsmarket.com,4.3,Organic grocery store with prepared foods,Organic|Prepared Foods,Organic Options|Prepared Foods|Parking Garage|Online Ordering
Equinox,gyms,"Financial District, Hartford, CT",+1-555-456-7890,https://equinox.com,4.4,Premium fitness club with spa services,Premium|Spa Services,Premium Amenities|Spa Services|Personal Training|Valet Parking
TD Bank,banks,"Main Street, Hartford, CT",+1-555-234-5678,https://td.com,4.1,Urban branch with extended hours,Extended Hours|ATM Available,Extended Hours|ATM|Online Banking|Safe Deposit Boxes
Duane Reade,pharmacies,"Broadway Plaza, Hartford, CT",+1-555-345-6789,https://duanereade.com,3.8,24-hour pharmacy and convenience store,24 Hour|Convenience,24 Hour Service|Convenience Items|Photo Services|Pharmacy`
    },
    suburban: {
      name: 'Suburban Area Template', 
      description: 'Family-friendly businesses common in suburban areas',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Dunkin',coffee shops,"Shopping Plaza, West Hartford, CT",+1-555-123-4567,https://dunkin.com,4.0,Popular coffee and donuts with drive-through,Drive-through|Local Chain,Drive-through|Free Parking|Mobile Ordering|Loyalty Program
Big Y Supermarkets,grocery stores,"Town Center, West Hartford, CT",+1-555-987-6543,https://bigy.com,4.2,Family grocery store with pharmacy and deli,Family Friendly|Pharmacy,Family Friendly|Pharmacy|Deli|Free Parking|Curbside Pickup
LA Fitness,gyms,"Retail Park, West Hartford, CT",+1-555-456-7890,https://lafitness.com,4.0,Full-service gym with pool and classes,Pool|Group Classes,Pool|Group Classes|Free Parking|Childcare|Personal Training
People's United Bank,banks,"Main Street, West Hartford, CT",+1-555-234-5678,https://peoples.com,4.2,Community bank with drive-through,Drive-through|Local Bank,Drive-through|Free Parking|Personal Service|ATM
Walgreens,pharmacies,"Corner Plaza, West Hartford, CT",+1-555-345-6789,https://walgreens.com,4.1,Pharmacy with photo services and convenience items,Drive-through|Photo Services,Drive-through|Photo Services|Convenience Items|Free Parking`
    },
    essentials: {
      name: 'Essential Services Only',
      description: 'Core essential businesses every area needs',
      data: `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Local Grocery,grocery stores,"Main St, Your City, CT",+1-555-000-0000,,4.0,Essential grocery shopping,Budget Friendly,Free Parking|Essential Items
Corner Pharmacy,pharmacies,"Main St, Your City, CT",+1-555-000-0001,,4.1,Prescription and health essentials,Essential Services,Pharmacy|Health Items
Gas Station,gas stations,"Highway Access, Your City, CT",+1-555-000-0002,,4.0,Fuel and convenience items,Essential Services,24 Hour Service|Convenience Store
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
              <li>• <strong>Categories:</strong> restaurants, grocery stores, pharmacies, gyms, banks, gas stations, coffee shops, beauty salons, medical, shopping</li>
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