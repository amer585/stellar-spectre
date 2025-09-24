import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImageMetadata {
  id: string;
  title: string;
  url: string;
  source: string;
  downloadDate: string;
  category: 'planet' | 'moon' | 'star' | 'galaxy' | 'nebula' | 'other';
  mission?: string;
  coordinates?: { ra: number; dec: number };
  fileSize?: number;
  resolution?: { width: number; height: number };
}

interface DatasetStats {
  totalImages: number;
  planetsCount: number;
  moonsCount: number;
  otherCount: number;
  duplicatesSkipped: number;
  failuresCount: number;
  sources: Record<string, number>;
}

// NASA Image and Video Library API
async function fetchNASAImages(query: string, limit: number): Promise<ImageMetadata[]> {
  console.log(`Fetching NASA images for query: ${query}, limit: ${limit}`);
  const images: ImageMetadata[] = [];
  
  try {
    let page = 1;
    const perPage = 100;
    
    while (images.length < limit) {
      const remaining = limit - images.length;
      const currentLimit = Math.min(remaining, perPage);
      
      const response = await fetch(
        `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page=${page}&page_size=${currentLimit}`
      );
      
      if (!response.ok) {
        console.error(`NASA API error: ${response.status}`);
        break;
      }
      
      const data = await response.json();
      
      if (!data.collection?.items?.length) {
        console.log(`No more NASA images found for query: ${query}`);
        break;
      }
      
      for (const item of data.collection.items) {
        if (images.length >= limit) break;
        
        const metadata = item.data?.[0];
        const links = item.links;
        
        if (metadata && links?.[0]?.href) {
          images.push({
            id: metadata.nasa_id || `nasa_${Date.now()}_${Math.random()}`,
            title: metadata.title || 'Untitled',
            url: links[0].href,
            source: 'NASA',
            downloadDate: new Date().toISOString(),
            category: categorizeImage(metadata.title, metadata.description),
            mission: metadata.center || undefined,
            coordinates: metadata.location ? parseCoordinates(metadata.location) : undefined
          });
        }
      }
      
      page++;
      
      // Avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  } catch (error) {
    console.error('Error fetching NASA images:', error);
  }
  
  console.log(`Fetched ${images.length} NASA images`);
  return images;
}

// ESA/Hubble Archive
async function fetchESAImages(limit: number): Promise<ImageMetadata[]> {
  console.log(`Fetching ESA/Hubble images, limit: ${limit}`);
  const images: ImageMetadata[] = [];
  
  try {
    // ESA/Hubble public API endpoints
    const endpoints = [
      'https://esahubble.org/api/images/?category=exoplanets&format=json',
      'https://esahubble.org/api/images/?category=planets&format=json',
      'https://esahubble.org/api/images/?category=stars&format=json'
    ];
    
    for (const endpoint of endpoints) {
      if (images.length >= limit) break;
      
      try {
        const response = await fetch(endpoint);
        if (!response.ok) continue;
        
        const data = await response.json();
        
        if (data.results) {
          for (const item of data.results) {
            if (images.length >= limit) break;
            
            if (item.image_files && item.image_files.length > 0) {
              const imageFile = item.image_files.find((f: any) => f.file_size > 100000) || item.image_files[0];
              
              images.push({
                id: item.id || `esa_${Date.now()}_${Math.random()}`,
                title: item.title || 'Untitled',
                url: imageFile.file_url,
                source: 'ESA/Hubble',
                downloadDate: new Date().toISOString(),
                category: categorizeImage(item.title, item.description),
                coordinates: item.coordinates ? parseCoordinates(item.coordinates) : undefined,
                fileSize: imageFile.file_size
              });
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error fetching from ${endpoint}:`, error);
      }
    }
  } catch (error) {
    console.error('Error fetching ESA images:', error);
  }
  
  console.log(`Fetched ${images.length} ESA images`);
  return images;
}

// Kaggle Datasets (using Kaggle API)
async function fetchKaggleDatasets(apiKey: string): Promise<ImageMetadata[]> {
  console.log('Fetching Kaggle astronomy datasets');
  const images: ImageMetadata[] = [];
  
  try {
    // Popular astronomy datasets on Kaggle
    const datasets = [
      'paultimothymooney/chest-xray-pneumonia', // Replace with actual astronomy datasets
      'alxmamaev/flowers-recognition',
      'jessicali9530/stanford-dogs-dataset'
    ];
    
    // Note: This would require proper Kaggle API integration
    // For now, we'll implement a placeholder that could be extended
    console.log('Kaggle integration requires additional setup - placeholder implementation');
    
  } catch (error) {
    console.error('Error fetching Kaggle datasets:', error);
  }
  
  return images;
}

// Categorize images based on title and description
function categorizeImage(title: string, description?: string): 'planet' | 'moon' | 'star' | 'galaxy' | 'nebula' | 'other' {
  const text = `${title} ${description || ''}`.toLowerCase();
  
  if (text.includes('planet') || text.includes('exoplanet') || text.includes('mars') || 
      text.includes('venus') || text.includes('jupiter') || text.includes('saturn') ||
      text.includes('neptune') || text.includes('uranus') || text.includes('mercury')) {
    return 'planet';
  }
  
  if (text.includes('moon') || text.includes('lunar') || text.includes('satellite')) {
    return 'moon';
  }
  
  if (text.includes('star') || text.includes('stellar') || text.includes('sun')) {
    return 'star';
  }
  
  if (text.includes('galaxy') || text.includes('galaxies')) {
    return 'galaxy';
  }
  
  if (text.includes('nebula') || text.includes('nebulae')) {
    return 'nebula';
  }
  
  return 'other';
}

// Parse coordinates from various formats
function parseCoordinates(location: string): { ra: number; dec: number } | undefined {
  try {
    // Simple regex for basic coordinate parsing
    const coords = location.match(/([\d.]+).*?([\d.]+)/);
    if (coords && coords.length >= 3) {
      return {
        ra: parseFloat(coords[1]),
        dec: parseFloat(coords[2])
      };
    }
  } catch (error) {
    console.error('Error parsing coordinates:', error);
  }
  return undefined;
}

// Download and store image with metadata
async function downloadAndStoreImage(
  supabase: any,
  imageMetadata: ImageMetadata,
  userId: string,
  existingHashes: Set<string>
): Promise<boolean> {
  try {
    console.log(`Downloading image: ${imageMetadata.title}`);
    
    // Download image
    const response = await fetch(imageMetadata.url);
    if (!response.ok) {
      console.error(`Failed to download image: ${response.status}`);
      return false;
    }
    
    const imageBlob = await response.blob();
    
    // Check for duplicates using simple size comparison (could be enhanced with perceptual hashing)
    const sizeHash = `${imageBlob.size}_${imageMetadata.source}`;
    if (existingHashes.has(sizeHash)) {
      console.log(`Duplicate detected: ${imageMetadata.title}`);
      return false;
    }
    existingHashes.add(sizeHash);
    
    // Determine folder based on category
    const folder = imageMetadata.category === 'planet' || imageMetadata.category === 'moon' 
      ? 'planets' : 'not_planets';
    
    // Generate unique filename
    const extension = imageMetadata.url.split('.').pop()?.split('?')[0] || 'jpg';
    const fileName = `${folder}/${imageMetadata.category}/${imageMetadata.id}.${extension}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('training-datasets')
      .upload(fileName, imageBlob, {
        contentType: imageBlob.type || 'image/jpeg',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`Upload error for ${imageMetadata.title}:`, uploadError);
      return false;
    }
    
    // Store metadata in database
    const { error: metadataError } = await supabase
      .from('image_metadata')
      .insert({
        id: imageMetadata.id,
        user_id: userId,
        title: imageMetadata.title,
        source: imageMetadata.source,
        category: imageMetadata.category,
        file_path: fileName,
        metadata: {
          originalUrl: imageMetadata.url,
          downloadDate: imageMetadata.downloadDate,
          mission: imageMetadata.mission,
          coordinates: imageMetadata.coordinates,
          fileSize: imageBlob.size,
          contentType: imageBlob.type
        }
      });
    
    if (metadataError) {
      console.error(`Metadata storage error:`, metadataError);
      // Don't return false here - the image was uploaded successfully
    }
    
    console.log(`Successfully stored: ${imageMetadata.title}`);
    return true;
    
  } catch (error) {
    console.error(`Error processing image ${imageMetadata.title}:`, error);
    return false;
  }
}

// Main dataset collection function
async function collectDataset(userId: string, targetCount: number = 10000): Promise<DatasetStats> {
  console.log(`Starting dataset collection for user ${userId}, target: ${targetCount} images`);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const stats: DatasetStats = {
    totalImages: 0,
    planetsCount: 0,
    moonsCount: 0,
    otherCount: 0,
    duplicatesSkipped: 0,
    failuresCount: 0,
    sources: {}
  };
  
  const existingHashes = new Set<string>();
  
  try {
    // Create storage bucket if it doesn't exist
    const { error: bucketError } = await supabase.storage.getBucket('training-datasets');
    if (bucketError) {
      console.log('Creating training-datasets bucket');
      await supabase.storage.createBucket('training-datasets', { public: false });
    }
    
    // Collect images from multiple sources
    const allImages: ImageMetadata[] = [];
    
    // NASA Images (40% of target)
    const nasaQueries = ['exoplanet', 'planet', 'mars', 'jupiter', 'saturn', 'venus', 'moon', 'lunar'];
    for (const query of nasaQueries) {
      const nasaImages = await fetchNASAImages(query, Math.floor(targetCount * 0.05));
      allImages.push(...nasaImages);
      if (allImages.length >= targetCount * 0.4) break;
    }
    
    // ESA/Hubble Images (30% of target)
    const esaImages = await fetchESAImages(Math.floor(targetCount * 0.3));
    allImages.push(...esaImages);
    
    // Kaggle datasets would go here (30% of target)
    const kaggleKey = Deno.env.get('KAGGLE_KEY');
    if (kaggleKey) {
      const kaggleImages = await fetchKaggleDatasets(kaggleKey);
      allImages.push(...kaggleImages);
    }
    
    console.log(`Collected ${allImages.length} images from all sources`);
    
    // Download and process images
    let processedCount = 0;
    const batchSize = 10; // Process in batches to avoid overwhelming the system
    
    for (let i = 0; i < allImages.length && processedCount < targetCount; i += batchSize) {
      const batch = allImages.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (imageMetadata) => {
        if (processedCount >= targetCount) return false;
        
        const success = await downloadAndStoreImage(supabase, imageMetadata, userId, existingHashes);
        
        if (success) {
          processedCount++;
          stats.totalImages++;
          stats.sources[imageMetadata.source] = (stats.sources[imageMetadata.source] || 0) + 1;
          
          switch (imageMetadata.category) {
            case 'planet':
              stats.planetsCount++;
              break;
            case 'moon':
              stats.moonsCount++;
              break;
            default:
              stats.otherCount++;
          }
        } else {
          stats.failuresCount++;
        }
        
        return success;
      });
      
      await Promise.all(batchPromises);
      
      // Progress update
      console.log(`Processed batch ${Math.floor(i/batchSize) + 1}, total processed: ${processedCount}`);
      
      // Brief pause between batches
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Dataset collection completed. Stats:`, stats);
    
  } catch (error) {
    console.error('Error in dataset collection:', error);
    throw error;
  }
  
  return stats;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, targetCount } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    switch (action) {
      case 'collect-dataset': {
        console.log(`Starting dataset collection for user ${userId}`);
        
        const stats = await collectDataset(userId, targetCount || 10000);
        
        return new Response(
          JSON.stringify({
            success: true,
            stats,
            message: `Successfully collected ${stats.totalImages} images`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
    
  } catch (error) {
    console.error('Error in advanced-dataset-collector:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});