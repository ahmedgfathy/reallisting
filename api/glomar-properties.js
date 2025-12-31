// Glomar Properties API endpoint
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      region = 'الكل',
      propertyType = 'الكل',
      category = 'الكل',
      purpose = 'الكل'
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query - fetch properties first
    let query = supabase
      .from('glomar_properties')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search && search !== '') {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%,name.ilike.%${search}%`);
    }

    if (region && region !== 'الكل') {
      query = query.eq('region_name', region);
    }

    if (propertyType && propertyType !== 'الكل') {
      query = query.eq('property_type_name', propertyType);
    }

    if (category && category !== 'الكل') {
      query = query.eq('category_name', category);
    }

    if (purpose && purpose !== 'الكل') {
      query = query.eq('property_purpose_name', purpose);
    }

    // Order by created_at desc
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Build image URLs from propertyimage field (JSON string)
    const properties = data.map(prop => {
      let images = [];
      
      // Parse propertyimage field if it exists
      if (prop.propertyimage) {
        try {
          const imgData = typeof prop.propertyimage === 'string' 
            ? JSON.parse(prop.propertyimage) 
            : prop.propertyimage;
          
          if (Array.isArray(imgData)) {
            images = imgData.map(img => {
              const url = img.fileUrl || img.image_url;
              if (!url) return null;
              
              // If URL is from cloud.appwrite.io, convert to remote server URL
              if (url.includes('cloud.appwrite.io')) {
                // Extract bucket_id and file_id from URL
                const match = url.match(/buckets\/([^\/]+)\/files\/([^\/\?]+)/);
                if (match) {
                  const [, bucketId, fileId] = match;
                  return `https://app.glomartrealestates.com/v1/storage/buckets/${bucketId}/files/${fileId}/view`;
                }
              }
              
              return url;
            }).filter(Boolean);
          }
        } catch (e) {
          // If parsing fails, try as plain string
          if (typeof prop.propertyimage === 'string' && prop.propertyimage.startsWith('http')) {
            images = [prop.propertyimage];
          }
        }
      }

      return {
        ...prop,
        images
      };
    });

    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      data: properties,
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages
    });

  } catch (error) {
    console.error('Error in glomar-properties API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
