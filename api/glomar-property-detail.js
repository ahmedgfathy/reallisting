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

    // Fetch images
    const { data: images } = await supabase
      .from('glomar_properties_images')
      .select('*')
      .eq('id', id); // Note: properties_images doesn't have property_id, uses id matching

    // Fetch videos
    const { data: videos } = await supabase
      .from('glomar_properties_videos')
      .select('*')
      .eq('id', id);

    // Build image URLs
    const imageUrls = images?.map(img => {
      if (img.file_id && img.bucket_id) {
        return `https://app.glomartrealestates.com/v1/storage/buckets/${img.bucket_id}/files/${img.file_id}/view`;
      }
      return img.image_url;
    }).filter(Boolean) || [];

    // Build video URLs
    const videoUrls = videos?.map(vid => {
      if (vid.file_id && vid.bucket_id) {
        return `https://app.glomartrealestates.com/v1/storage/buckets/${vid.bucket_id}/files/${vid.file_id}/view`;
      }
      return vid.video_url;
    }).filter(Boolean) || [];

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
