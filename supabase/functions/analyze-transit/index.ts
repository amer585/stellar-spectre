import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Advanced transit detection algorithm
function detectTransits(timeData: number[], fluxData: number[]): {
  detection: boolean;
  orbital_period?: number;
  transit_depth?: number;
  planet_radius_ratio?: number;
  confidence_score: number;
  transit_duration?: number;
  signal_to_noise?: number;
  analysis_notes?: string;
} {
  try {
    console.log(`Analyzing ${timeData.length} data points`);
    
    // Normalize flux data
    const meanFlux = fluxData.reduce((sum, f) => sum + f, 0) / fluxData.length;
    const normalizedFlux = fluxData.map(f => f / meanFlux);
    
    // Calculate standard deviation for noise estimation
    const variance = normalizedFlux.reduce((sum, f) => sum + Math.pow(f - 1, 2), 0) / normalizedFlux.length;
    const stdDev = Math.sqrt(variance);
    
    console.log(`Data stats - Mean flux: ${meanFlux}, Std dev: ${stdDev}`);
    
    // Find potential transit events (dips below threshold)
    const threshold = 1 - (3 * stdDev); // 3-sigma threshold
    const transitEvents: { time: number; depth: number; index: number }[] = [];
    
    for (let i = 1; i < normalizedFlux.length - 1; i++) {
      if (normalizedFlux[i] < threshold) {
        // Check if it's a local minimum
        if (normalizedFlux[i] < normalizedFlux[i-1] && normalizedFlux[i] < normalizedFlux[i+1]) {
          const depth = 1 - normalizedFlux[i];
          transitEvents.push({
            time: timeData[i],
            depth: depth,
            index: i
          });
        }
      }
    }
    
    console.log(`Found ${transitEvents.length} potential transit events`);
    
    if (transitEvents.length < 2) {
      return {
        detection: false,
        confidence_score: 0,
        analysis_notes: `Insufficient transit events detected (${transitEvents.length}). Need at least 2 events for period determination.`
      };
    }
    
    // Analyze periods between events
    const periods: number[] = [];
    for (let i = 1; i < transitEvents.length; i++) {
      const period = transitEvents[i].time - transitEvents[i-1].time;
      if (period > 0.1) { // Minimum period of 0.1 days (2.4 hours)
        periods.push(period);
      }
    }
    
    if (periods.length === 0) {
      return {
        detection: false,
        confidence_score: 10,
        analysis_notes: "Transit events too close together or irregular timing."
      };
    }
    
    // Find most common period (mode)
    const periodCounts = new Map<string, number>();
    const tolerance = 0.1; // 10% tolerance for period matching
    
    for (const period of periods) {
      let matched = false;
      for (const [key, count] of periodCounts.entries()) {
        const keyPeriod = parseFloat(key);
        if (Math.abs(period - keyPeriod) / keyPeriod < tolerance) {
          periodCounts.set(key, count + 1);
          matched = true;
          break;
        }
      }
      if (!matched) {
        periodCounts.set(period.toString(), 1);
      }
    }
    
    // Get the most frequent period
    let mostCommonPeriod = 0;
    let maxCount = 0;
    for (const [period, count] of periodCounts.entries()) {
      if (count > maxCount) {
        maxCount = count;
        mostCommonPeriod = parseFloat(period);
      }
    }
    
    // Calculate average transit depth
    const avgDepth = transitEvents.reduce((sum, event) => sum + event.depth, 0) / transitEvents.length;
    
    // Estimate planet radius ratio (simplified)
    const planetRadiusRatio = Math.sqrt(avgDepth);
    
    // Calculate signal-to-noise ratio
    const signalToNoise = avgDepth / stdDev;
    
    // Estimate transit duration (simplified - should be more sophisticated)
    const transitDuration = mostCommonPeriod * 0.1; // Rough estimate: 10% of orbital period
    
    // Calculate confidence score based on multiple factors
    let confidence = 0;
    
    // Period consistency (30 points max)
    const periodConsistency = maxCount / periods.length;
    confidence += periodConsistency * 30;
    
    // Signal strength (25 points max)
    const signalStrength = Math.min(signalToNoise / 5, 1); // Normalize to 0-1
    confidence += signalStrength * 25;
    
    // Number of transits (20 points max)
    const transitCount = Math.min(transitEvents.length / 5, 1); // Normalize to 0-1
    confidence += transitCount * 20;
    
    // Depth consistency (15 points max)
    const depthVariance = transitEvents.reduce((sum, event) => sum + Math.pow(event.depth - avgDepth, 2), 0) / transitEvents.length;
    const depthConsistency = Math.max(0, 1 - (depthVariance / avgDepth));
    confidence += depthConsistency * 15;
    
    // Reasonable period range (10 points max)
    const periodReasonable = (mostCommonPeriod >= 0.5 && mostCommonPeriod <= 1000) ? 10 : 0;
    confidence += periodReasonable;
    
    confidence = Math.round(Math.min(confidence, 100));
    
    const hasDetection = confidence >= 50 && transitEvents.length >= 2 && signalToNoise >= 2;
    
    let analysisNotes = `Analyzed ${transitEvents.length} transit-like events. `;
    analysisNotes += `Period consistency: ${(periodConsistency * 100).toFixed(1)}%. `;
    analysisNotes += `Signal-to-noise ratio: ${signalToNoise.toFixed(2)}. `;
    
    if (hasDetection) {
      analysisNotes += "Transit signature detected with high confidence.";
    } else if (confidence >= 30) {
      analysisNotes += "Possible transit signature detected but requires further investigation.";
    } else {
      analysisNotes += "No clear transit signature detected in the data.";
    }
    
    console.log(`Analysis complete - Detection: ${hasDetection}, Confidence: ${confidence}%`);
    
    return {
      detection: hasDetection,
      orbital_period: mostCommonPeriod,
      transit_depth: avgDepth,
      planet_radius_ratio: planetRadiusRatio,
      confidence_score: confidence,
      transit_duration: transitDuration,
      signal_to_noise: signalToNoise,
      analysis_notes: analysisNotes
    };
    
  } catch (error) {
    console.error('Error in transit detection:', error);
    return {
      detection: false,
      confidence_score: 0,
      analysis_notes: `Analysis failed due to error: ${error.message}`
    };
  }
}

// Parse CSV data
function parseCSVData(csvContent: string): { time: number[], flux: number[] } {
  const lines = csvContent.trim().split('\n');
  const time: number[] = [];
  const flux: number[] = [];
  
  // Skip header if present
  const startIndex = lines[0].toLowerCase().includes('time') || lines[0].toLowerCase().includes('flux') ? 1 : 0;
  
  for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length >= 2) {
      const timeVal = parseFloat(parts[0].trim());
      const fluxVal = parseFloat(parts[1].trim());
      
      if (!isNaN(timeVal) && !isNaN(fluxVal)) {
        time.push(timeVal);
        flux.push(fluxVal);
      }
    }
  }
  
  return { time, flux };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, fileName, originalName } = await req.json();
    
    console.log(`Processing analysis for user ${userId}, file: ${originalName}`);

    // Create analysis record
    const { data: analysisRecord, error: insertError } = await supabase
      .from('transit_analyses')
      .insert({
        user_id: userId,
        file_name: originalName,
        file_path: `${userId}/${fileName}`,
        status: 'processing'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating analysis record:', insertError);
      throw insertError;
    }

    console.log(`Created analysis record: ${analysisRecord.id}`);

    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('light-curves')
      .download(`${userId}/${fileName}`);

    if (downloadError) {
      console.error('Error downloading file:', downloadError);
      await supabase
        .from('transit_analyses')
        .update({ 
          status: 'failed',
          analysis_result: { 
            detection: false, 
            confidence_score: 0, 
            analysis_notes: `Failed to download file: ${downloadError.message}` 
          }
        })
        .eq('id', analysisRecord.id);
      
      throw downloadError;
    }

    // Convert file to text
    const fileContent = await fileData.text();
    console.log(`File content length: ${fileContent.length} characters`);

    // Parse the data
    const { time, flux } = parseCSVData(fileContent);
    
    if (time.length === 0 || flux.length === 0) {
      const errorMsg = 'No valid data points found in file. Please ensure your file contains time and flux columns.';
      await supabase
        .from('transit_analyses')
        .update({ 
          status: 'failed',
          analysis_result: { 
            detection: false, 
            confidence_score: 0, 
            analysis_notes: errorMsg 
          }
        })
        .eq('id', analysisRecord.id);
      
      return new Response(
        JSON.stringify({ error: errorMsg }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`Parsed ${time.length} data points for analysis`);

    // Perform transit analysis
    const analysisResult = detectTransits(time, flux);
    
    // Update the analysis record with results
    const { error: updateError } = await supabase
      .from('transit_analyses')
      .update({
        status: 'completed',
        analysis_result: analysisResult
      })
      .eq('id', analysisRecord.id);

    if (updateError) {
      console.error('Error updating analysis record:', updateError);
      throw updateError;
    }

    console.log(`Analysis completed successfully for record ${analysisRecord.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysisId: analysisRecord.id,
        result: analysisResult 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-transit function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});