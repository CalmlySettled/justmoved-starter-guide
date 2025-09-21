import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { MapPin } from 'lucide-react';
import bankBuilding from '@/assets/fallbacks/bank-building.jpg';
import pharmacyBuilding from '@/assets/fallbacks/pharmacy-building.jpg';
import beautyFlowers from '@/assets/fallbacks/beauty-flowers.jpg';
import furnitureHome from '@/assets/fallbacks/furniture-home.jpg';
import groceryStockPhoto from '@/assets/category-stock/grocery-stores.jpg';
import pharmacyStockPhoto from '@/assets/category-stock/pharmacy.jpg';
import gasStationStockPhoto from '@/assets/category-stock/gas-stations.jpg';
import junkRemovalStockPhoto from '@/assets/category-stock/junk-removal.jpg';
import internetProviderStockPhoto from '@/assets/category-stock/internet-providers.jpg';
import bankStockPhoto from '@/assets/category-stock/banks.jpg';
import hardwareStoreStockPhoto from '@/assets/category-stock/hardware-stores.jpg';

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  businessName?: string;
  category?: string;
  fallbackIcon?: React.ReactNode;
  className?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  businessName = '',
  category = '',
  fallbackIcon,
  className,
  ...props
}) => {
  const [imageState, setImageState] = useState<'loading' | 'loaded' | 'error'>('loading');
  
  // Stock photos for categories - HIGHEST PRIORITY (global for all users)
  const categoryStockPhotos: Record<string, string> = {
    'grocery': groceryStockPhoto,
    'pharmacy': pharmacyStockPhoto,
    'gas': gasStationStockPhoto,
    'junk': junkRemovalStockPhoto,
    'internet': internetProviderStockPhoto,
    'bank': bankStockPhoto,
    'hardware': hardwareStoreStockPhoto,
  };
  
  // Use stock photo immediately if available for the category, otherwise use original src
  const getInitialSrc = () => {
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('grocery') || categoryLower.includes('supermarket') || categoryLower.includes('market')) {
      return categoryStockPhotos['grocery'];
    }
    if (categoryLower.includes('pharmacy') || categoryLower.includes('pharmacies') || categoryLower.includes('drug') || categoryLower.includes('medicine')) {
      return categoryStockPhotos['pharmacy'];
    }
    if (categoryLower.includes('gas') || categoryLower.includes('fuel') || categoryLower.includes('station') || categoryLower.includes('petrol')) {
      return categoryStockPhotos['gas'];
    }
    if (categoryLower.includes('junk') || categoryLower.includes('removal') || categoryLower.includes('waste') || categoryLower.includes('trash') || categoryLower.includes('debris')) {
      return categoryStockPhotos['junk'];
    }
    if (categoryLower.includes('internet') || categoryLower.includes('isp') || categoryLower.includes('broadband') || categoryLower.includes('wifi') || categoryLower.includes('cable')) {
      return categoryStockPhotos['internet'];
    }
    if (categoryLower.includes('bank') || categoryLower.includes('financial') || categoryLower.includes('credit union') || categoryLower.includes('atm')) {
      return categoryStockPhotos['bank'];
    }
    if (categoryLower.includes('hardware') || categoryLower.includes('tools') || categoryLower.includes('home improvement') || categoryLower.includes('construction')) {
      return categoryStockPhotos['hardware'];
    }
    return src;
  };
  
  const [currentSrc, setCurrentSrc] = useState(getInitialSrc());

  const brandLogos: Record<string, string> = {
    'safeway': '/lovable-uploads/542619d4-3d1e-40d0-af95-87134e5ef6f7.png',
    'whole foods': '/lovable-uploads/cec2b417-1f35-49f4-978b-2f52c1219d84.png',
    'trader joe': '/lovable-uploads/89feab14-0e28-4cd7-a754-faee6f9fcdc1.png',
    'walmart': '/lovable-uploads/c12c56bb-6db1-41e0-81c2-8c078a7a9f4f.png',
    'target': '/lovable-uploads/1ef25225-bb29-4bb5-8412-d243c3f03382.png',
    'costco': '/lovable-uploads/eb8b8540-f130-414b-84da-27c82f2c8431.png',
    'kroger': '/lovable-uploads/ed0b00a3-fd88-4104-b572-2dcd3ea54425.png',
    'stop & shop': '/lovable-uploads/4d41876b-9d9e-4a4d-abb8-5b4b924e2e23.png',
    'aldi': '/lovable-uploads/eb8b8540-f130-414b-84da-27c82f2c8431.png',
    'planet fitness': '/lovable-uploads/b393c4b5-8487-47b0-a991-d59fbc4c421c.png',
    'la fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png',
    'gold\'s gym': '/lovable-uploads/8ae3c503-4c33-4e74-a098-c0bf7cf1e90f.png',
    '24 hour fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png',
    'anytime fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png'
  };


  const categoryFallbacks: Record<string, string> = {
    'grocery': '/lovable-uploads/5e3cefe3-ab65-41b6-9ee4-0c5b23a69fa1.png',
    'fitness': '/lovable-uploads/501a0890-d137-41da-96d5-83f7c4514751.png',
    'church': '/lovable-uploads/c4857259-5956-4aa3-8861-a261d3185571.png',
    'faith': '/lovable-uploads/c4857259-5956-4aa3-8861-a261d3185571.png',
    'restaurant': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
    'medical': '/lovable-uploads/e271092c-0635-42eb-894e-482c1c580fee.png',
    'pharmacy': pharmacyBuilding,
    'bank': bankBuilding,
    'financial': bankBuilding,
    'school': bankBuilding,
    'education': bankBuilding,
    'beauty': beautyFlowers,
    'salon': beautyFlowers,
    'spa': beautyFlowers,
    'auto': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
    'automotive': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
    'government': bankBuilding,
    'veterinary': '/lovable-uploads/e271092c-0635-42eb-894e-482c1c580fee.png',
    'pet': '/lovable-uploads/e271092c-0635-42eb-894e-482c1c580fee.png',
    'furniture': furnitureHome,
    'home': furnitureHome,
    'shopping': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
    'retail': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
    'entertainment': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png',
    'green space': '/lovable-uploads/86e7b131-4de7-4288-9579-ec892f903f5b.png',
    'default': '/lovable-uploads/da2a2bcf-7c5a-4b95-bc28-3b8bd337cc1c.png'
  };

  const getNextFallback = () => {
    // FIRST: Check for category stock photos (global standardized images)
    const categoryLower = category.toLowerCase();
    
    if (categoryLower.includes('grocery') || categoryLower.includes('supermarket') || categoryLower.includes('market')) {
      return categoryStockPhotos['grocery'];
    }
    
    if (categoryLower.includes('pharmacy') || categoryLower.includes('pharmacies') || categoryLower.includes('drug') || categoryLower.includes('medicine')) {
      return categoryStockPhotos['pharmacy'];
    }
    
    if (categoryLower.includes('gas') || categoryLower.includes('fuel') || categoryLower.includes('station') || categoryLower.includes('petrol')) {
      return categoryStockPhotos['gas'];
    }
    
    if (categoryLower.includes('junk') || categoryLower.includes('removal') || categoryLower.includes('waste') || categoryLower.includes('trash') || categoryLower.includes('debris')) {
      return categoryStockPhotos['junk'];
    }
    
    if (categoryLower.includes('internet') || categoryLower.includes('isp') || categoryLower.includes('broadband') || categoryLower.includes('wifi') || categoryLower.includes('cable')) {
      return categoryStockPhotos['internet'];
    }
    
    if (categoryLower.includes('bank') || categoryLower.includes('financial') || categoryLower.includes('credit union') || categoryLower.includes('atm')) {
      return categoryStockPhotos['bank'];
    }
    
    if (categoryLower.includes('hardware') || categoryLower.includes('tools') || categoryLower.includes('home improvement') || categoryLower.includes('construction')) {
      return categoryStockPhotos['hardware'];
    }

    // SECOND: Check for brand logo (only if no stock photo available)
    const businessNameLower = businessName.toLowerCase();
    for (const [brand, logoUrl] of Object.entries(brandLogos)) {
      if (businessNameLower.includes(brand)) {
        return logoUrl;
      }
    }

    // THIRD: Check for category fallback
    let categoryKey = 'default';
    
    if (categoryLower.includes('grocery') || categoryLower.includes('supermarket') || categoryLower.includes('market')) {
      categoryKey = 'grocery';
    } else if (categoryLower.includes('fitness') || categoryLower.includes('gym') || categoryLower.includes('exercise')) {
      categoryKey = 'fitness';
    } else if (categoryLower.includes('church') || categoryLower.includes('faith') || categoryLower.includes('religious')) {
      categoryKey = 'faith';
    } else if (categoryLower.includes('restaurant') || categoryLower.includes('food') || categoryLower.includes('dining')) {
      categoryKey = 'restaurant';
    } else if (categoryLower.includes('pharmacy') || categoryLower.includes('drugstore') || categoryLower.includes('cvs') || categoryLower.includes('walgreens')) {
      categoryKey = 'pharmacy';
    } else if (categoryLower.includes('bank') || categoryLower.includes('credit union') || categoryLower.includes('atm')) {
      categoryKey = 'bank';
    } else if (categoryLower.includes('financial') || categoryLower.includes('insurance') || categoryLower.includes('loan')) {
      categoryKey = 'financial';
    } else if (categoryLower.includes('school') || categoryLower.includes('university') || categoryLower.includes('college') || categoryLower.includes('library')) {
      categoryKey = 'school';
    } else if (categoryLower.includes('education') || categoryLower.includes('learning') || categoryLower.includes('academy')) {
      categoryKey = 'education';
    } else if (categoryLower.includes('beauty') || categoryLower.includes('nail') || categoryLower.includes('hair') || categoryLower.includes('makeup')) {
      categoryKey = 'beauty';
    } else if (categoryLower.includes('salon') || categoryLower.includes('barber') || categoryLower.includes('hairdresser')) {
      categoryKey = 'salon';
    } else if (categoryLower.includes('spa') || categoryLower.includes('massage') || categoryLower.includes('wellness')) {
      categoryKey = 'spa';
    } else if (categoryLower.includes('auto') || categoryLower.includes('car') || categoryLower.includes('automotive') || categoryLower.includes('mechanic')) {
      categoryKey = 'auto';
    } else if (categoryLower.includes('government') || categoryLower.includes('dmv') || categoryLower.includes('city hall') || categoryLower.includes('courthouse')) {
      categoryKey = 'government';
    } else if (categoryLower.includes('veterinary') || categoryLower.includes('vet') || categoryLower.includes('animal hospital')) {
      categoryKey = 'veterinary';
    } else if (categoryLower.includes('pet') || categoryLower.includes('animal') || categoryLower.includes('grooming')) {
      categoryKey = 'pet';
    } else if (categoryLower.includes('furniture') || categoryLower.includes('decor') || categoryLower.includes('interior')) {
      categoryKey = 'furniture';
    } else if (categoryLower.includes('home') || categoryLower.includes('hardware') || categoryLower.includes('improvement')) {
      categoryKey = 'home';
    } else if (categoryLower.includes('shopping') || categoryLower.includes('mall') || categoryLower.includes('store')) {
      categoryKey = 'shopping';
    } else if (categoryLower.includes('retail') || categoryLower.includes('clothing') || categoryLower.includes('apparel')) {
      categoryKey = 'retail';
    } else if (categoryLower.includes('entertainment') || categoryLower.includes('theater') || categoryLower.includes('cinema') || categoryLower.includes('movie')) {
      categoryKey = 'entertainment';
    } else if (categoryLower.includes('medical') || categoryLower.includes('health') || categoryLower.includes('doctor') || categoryLower.includes('clinic')) {
      categoryKey = 'medical';
    } else if (categoryLower.includes('park') || categoryLower.includes('green') || categoryLower.includes('recreation')) {
      categoryKey = 'green space';
    }

    return categoryFallbacks[categoryKey] || '/public/placeholder.svg';
  };

  const handleError = () => {
    if (currentSrc !== '/public/placeholder.svg') {
      const fallback = getNextFallback();
      if (fallback !== currentSrc) {
        setCurrentSrc(fallback);
        return;
      }
    }
    setImageState('error');
  };

  if (imageState === 'error') {
    return (
      <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50", className)}>
        {fallbackIcon || <MapPin className="h-12 w-12 text-muted-foreground/40" />}
      </div>
    );
  }

  return (
    <img
      {...props}
      src={currentSrc}
      alt={alt}
      className={cn(className)}
      onLoad={() => setImageState('loaded')}
      onError={handleError}
    />
  );
};