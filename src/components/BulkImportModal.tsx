import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Upload, Download, FileText, AlertCircle } from 'lucide-react';
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

  const csvTemplate = `Business Name,Category,Address,Phone,Website,Rating,Description,Subfilter Tags (pipe separated),Features (pipe separated)
Starbucks,coffee shops,"123 Main St, Hartford, CT",+1-555-123-4567,https://starbucks.com,4.2,Popular coffee chain with WiFi and pastries,Drive-through|Local Chain,Free WiFi|Drive-through|Loyalty Program
Stop & Shop,grocery stores,"456 Park Ave, Hartford, CT",+1-555-987-6543,https://stopandshop.com,4.0,Full-service grocery store with pharmacy,Budget Friendly|Pharmacy,Free Parking|Pharmacy|Online Ordering
Planet Fitness,gyms,"789 Elm St, Hartford, CT",+1-555-456-7890,https://planetfitness.com,4.1,24-hour gym with modern equipment,24 Hour|Budget Friendly,24 Hour Service|Air Conditioning|Free Parking`;

  const downloadTemplate = () => {
    const blob = new Blob([csvTemplate], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business_import_template.csv';
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
                  Start with our CSV template to ensure your data is formatted correctly.
                </p>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-2">
                  <Download className="h-4 w-4 mr-1" />
                  Download Template
                </Button>
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