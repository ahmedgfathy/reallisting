// Get single property details with images and videos
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    return res.status(200).json({});
  }

  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: 'Property ID required' });
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

    // Parse images from propertyimage field (JSON string)
    let imageUrls = [];
    if (property.propertyimage) {
      try {
        const imgData = typeof property.propertyimage === 'string' 
          ? JSON.parse(property.propertyimage) 
          : property.propertyimage;
        
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
        if (typeof property.propertyimage === 'string' && property.propertyimage.startsWith('http')) {
          imageUrls = [property.propertyimage];
        }
      }
    }

    // Parse videos from videos field (JSON string)
    let videoUrls = [];
    if (property.videos) {
      try {
        const vidData = typeof property.videos === 'string' 
          ? JSON.parse(property.videos) 
          : property.videos;
        
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
        if (typeof property.videos === 'string' && property.videos.startsWith('http')) {
          videoUrls = [property.videos];
        }
      }
    }

    res.status(200).json({
      ...property,
      images: imageUrls,
      videos: videoUrls
    });

  } catch (error) {
    console.error('Error in property-detail API:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
