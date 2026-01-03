// Glomar Properties API endpoint
const { supabase, corsHeaders, verifyToken } = require('./_lib/supabase');

// Removed local client initialization since we use the shared one

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

    // Check if user is authenticated and approved
    const authHeader = req.headers.authorization;
    let isApprovedUser = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload && payload.username) {
        // Check if user is active
        const { data: userData } = await supabase
          .from('users')
          .select('is_active, role')
          .eq('mobile', payload.username)
          .single();

        if (userData) {
          isApprovedUser = userData.role === 'admin' || userData.is_active === true;
        }
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Build query - fetch ALL properties matching filters (no pagination yet)
    let query = supabase
      .from('glomar_properties')
      .select('*', { count: 'exact' });

    // Apply filters
    if (search && search !== '') {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,location.ilike.%${search}%,name.ilike.%${search}%,compoundname.ilike.%${search}%`);
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
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Build image URLs from propertyimage field (JSON string)
    const properties = data.map(prop => {
      // Remove sensitive contact information fields if not approved
      let safeProp;
      if (isApprovedUser) {
        safeProp = prop;
      } else {
        const { mobileno, tel, ...rest } = prop;
        safeProp = rest;
      }

      let images = [];
      let videos = [];

      // Parse propertyimage field if it exists
      if (safeProp.propertyimage) {
        try {
          const imgData = typeof safeProp.propertyimage === 'string'
            ? JSON.parse(safeProp.propertyimage)
            : safeProp.propertyimage;

          if (Array.isArray(imgData)) {
            images = imgData.map(img => {
              // Use the ID from the image object to construct the URL
              if (img.id) {
                // Point to Supabase Storage - files are named as {id}.jpg
                return `${process.env.SUPABASE_URL || 'https://gxyrpboyubpycejlkxue.supabase.co'}/storage/v1/object/public/properties/${img.id}.jpg`;
              }
              return null;
            }).filter(Boolean);
          }
        } catch (e) {
          // If parsing fails, try as plain string
          if (typeof safeProp.propertyimage === 'string' && safeProp.propertyimage.startsWith('http')) {
            images = [safeProp.propertyimage];
          }
        }
      }

      // Parse videos field if it exists
      if (safeProp.videos) {
        try {
          const vidData = typeof safeProp.videos === 'string'
            ? JSON.parse(safeProp.videos)
            : safeProp.videos;

          if (Array.isArray(vidData)) {
            videos = vidData.map(vid => {
              // Use the ID from the video object to construct the URL
              if (vid.id) {
                // Point to Supabase Storage - files are named as {id}.mp4
                return `${process.env.SUPABASE_URL || 'https://gxyrpboyubpycejlkxue.supabase.co'}/storage/v1/object/public/properties/${vid.id}.mp4`;
              }
              return null;
            }).filter(Boolean);
          }
        } catch (e) {
          // If parsing fails, try as plain string
          if (typeof safeProp.videos === 'string' && safeProp.videos.startsWith('http')) {
            videos = [safeProp.videos];
          }
        }
      }

      return {
        ...safeProp,
        images,
        videos,
        hasImages: images.length > 0,
        hasVideos: videos.length > 0
      };
    });

    // Sort properties: those with images first, then by creation date
    properties.sort((a, b) => {
      if (a.hasImages && !b.hasImages) return -1;
      if (!a.hasImages && b.hasImages) return 1;
      // If both have images or both don't, maintain creation date order
      return 0;
    });

    // Apply pagination AFTER sorting
    const paginatedProperties = properties.slice(offset, offset + parseInt(limit));

    const totalPages = Math.ceil(count / parseInt(limit));

    res.status(200).json({
      data: paginatedProperties,
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
