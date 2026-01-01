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
    // Fetch all properties to extract unique filter values
    const { data: properties, error } = await supabase
      .from('glomar_properties')
      .select('region_name, property_type_name, category_name, property_purpose_name');

    if (error) {
      console.error('Error fetching properties for filters:', error);
      return res.status(500).json({ error: error.message });
    }

    // Extract unique values
    const regionsSet = new Set();
    const propertyTypesSet = new Set();
    const categoriesSet = new Set();
    const purposesSet = new Set();

    properties.forEach(prop => {
      if (prop.region_name) regionsSet.add(prop.region_name);
      if (prop.property_type_name) propertyTypesSet.add(prop.property_type_name);
      if (prop.category_name) categoriesSet.add(prop.category_name);
      if (prop.property_purpose_name) purposesSet.add(prop.property_purpose_name);
    });

    // Convert to sorted arrays
    const regions = Array.from(regionsSet).sort((a, b) => a.localeCompare(b, 'ar'));
    const propertyTypes = Array.from(propertyTypesSet).sort((a, b) => a.localeCompare(b, 'ar'));
    const categories = Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, 'ar'));
    const purposes = Array.from(purposesSet).sort((a, b) => a.localeCompare(b, 'ar'));

    res.status(200).json({
      regions,
      propertyTypes,
      categories,
      purposes
    });

  } catch (error) {
    console.error('Error fetching filter options:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

