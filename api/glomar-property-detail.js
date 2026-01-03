// Get single property details with images and videos
const { supabase, verifyToken } = require('./_lib/supabase');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Property ID required' });
    }

    // Check if user is authenticated and is admin
    const authHeader = req.headers.authorization;
    let isAdmin = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const payload = verifyToken(token);

      if (payload && payload.username) {
        // Check if user is admin
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('mobile', payload.username)
          .single();

        if (userData) {
          isAdmin = userData.role === 'admin';
        }
      }
    }

    // Fetch property with images and videos
    const { data: property, error } = await supabase
      .from('glomar_properties')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching property:', error);
      return res.status(404).json({ error: 'Property not found' });
    }

    // Remove sensitive contact information fields for non-admin users
    let safeProperty;
    if (isAdmin) {
      safeProperty = property;
    } else {
      const { mobileno, tel, ...rest } = property;
      safeProperty = rest;
    }

    // Parse images from propertyimage field (JSON string)
    let imageUrls = [];
    if (safeProperty.propertyimage) {
      try {
        const imgData = typeof safeProperty.propertyimage === 'string' 
          ? JSON.parse(safeProperty.propertyimage) 
          : safeProperty.propertyimage;
        
        if (Array.isArray(imgData)) {
          imageUrls = imgData.map(img => {
            // Use the ID from the image object to construct the URL
            if (img.id) {
              return `https://app.glomartrealestates.com/storage/properties/images/${img.id}.jpg`;
            }
            return null;
          }).filter(Boolean);
        }
      } catch (e) {
        if (typeof safeProperty.propertyimage === 'string' && safeProperty.propertyimage.startsWith('http')) {
          imageUrls = [safeProperty.propertyimage];
        }
      }
    }

    // Parse videos from videos field (JSON string)
    let videoUrls = [];
    if (safeProperty.videos) {
      try {
        const vidData = typeof safeProperty.videos === 'string' 
          ? JSON.parse(safeProperty.videos) 
          : safeProperty.videos;
        
        if (Array.isArray(vidData)) {
          videoUrls = vidData.map(vid => {
            // Use the ID from the video object to construct the URL
            if (vid.id) {
              return `https://app.glomartrealestates.com/storage/properties/videos/${vid.id}.mp4`;
            }
            return null;
          }).filter(Boolean);
        }
      } catch (e) {
        if (typeof safeProperty.videos === 'string' && safeProperty.videos.startsWith('http')) {
          videoUrls = [safeProperty.videos];
        }
      }
    }

    res.status(200).json({
      ...safeProperty,
      images: imageUrls,
      videos: videoUrls
    });

  } catch (error) {
    console.error('Error in property-detail API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
