// Get filter options for glomar properties
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
    // Fetch regions
    const { data: regions } = await supabase
      .from('glomar_regions')
      .select('name')
      .order('name');

    // Fetch property types
    const { data: propertyTypes } = await supabase
      .from('glomar_property_types')
      .select('name')
      .order('name');

    // Fetch categories
    const { data: categories } = await supabase
      .from('glomar_property_categories')
      .select('name')
      .order('name');

    // Fetch purposes
    const { data: purposes } = await supabase
      .from('glomar_property_purposes')
      .select('name')
      .order('name');

    res.status(200).json({
      regions: regions?.map(r => r.name).filter(Boolean) || [],
      propertyTypes: propertyTypes?.map(p => p.name).filter(Boolean) || [],
      categories: categories?.map(c => c.name).filter(Boolean) || [],
      purposes: purposes?.map(p => p.name).filter(Boolean) || []
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
