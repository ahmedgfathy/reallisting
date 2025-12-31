-- Supabase schema for glomart_data properties migration

-- 1. Projects table
CREATE TABLE IF NOT EXISTS glomar_projects (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    name VARCHAR(500),
    code VARCHAR(500),
    description VARCHAR(500),
    region_id VARCHAR(500),
    developer_name TEXT,
    delivery_date TEXT,
    is_active BOOLEAN DEFAULT true,
    sequence BIGINT,
    permissions JSONB,
    databaseid VARCHAR(500),
    collectionid VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_glomar_projects_created ON glomar_projects(created_at);
CREATE INDEX IF NOT EXISTS idx_glomar_projects_region ON glomar_projects(region_id);

-- 2. Properties table
CREATE TABLE IF NOT EXISTS glomar_properties (
    id VARCHAR(255) PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    building VARCHAR(255),
    propertynumber VARCHAR(255),
    thefloors VARCHAR(255),
    unitfeatures VARCHAR(255),
    phase VARCHAR(255),
    note VARCHAR(1000),
    inoroutsidecompound VARCHAR(255),
    description TEXT,
    lastfollowin VARCHAR(255),
    status VARCHAR(255),
    propertyofferedby VARCHAR(255),
    name VARCHAR(255),
    unitno VARCHAR(255),
    callupdate VARCHAR(255),
    forupdate TEXT,
    handler VARCHAR(255),
    sales VARCHAR(255),
    modifiedtime VARCHAR(255),
    landarea VARCHAR(255),
    rentfrom VARCHAR(255),
    rentto VARCHAR(255),
    compoundname VARCHAR(255),
    liked TEXT,
    inhome TEXT,
    rooms TEXT,
    mobileno VARCHAR(255),
    totalprice TEXT,
    pricepermeter TEXT,
    propertyimage TEXT,
    videos TEXT,
    tel VARCHAR(255),
    users TEXT,
    project VARCHAR(255),
    installment TEXT,
    payedevery TEXT,
    monthly VARCHAR(255),
    createdtime VARCHAR(255),
    downpayment TEXT,
    spaceeerth TEXT,
    spaceunit TEXT,
    spaceguard TEXT,
    title TEXT,
    price TEXT,
    location TEXT,
    images TEXT,
    region_id_new VARCHAR(255),
    property_type_id_new VARCHAR(255),
    finishing_level_id_new VARCHAR(255),
    currency_id_new VARCHAR(255),
    category_id_new VARCHAR(255),
    unit_facility_id_new VARCHAR(255),
    unit_purpose_id_new TEXT,
    region_name VARCHAR(255),
    country_name VARCHAR(255),
    property_type_name VARCHAR(255),
    unit_type_name TEXT,
    category_name TEXT,
    property_purpose_name TEXT,
    currency_name TEXT,
    currency_symbol TEXT,
    payment_type_name TEXT,
    finishing_level_name TEXT,
    development_phase_name TEXT,
    activity TEXT,
    land_area TEXT,
    built_area TEXT,
    bedrooms_count TEXT,
    _sequence TEXT,
    _permissions TEXT,
    _databaseid VARCHAR(255),
    _collectionid VARCHAR(255),
    FOREIGN KEY (project) REFERENCES glomar_projects(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_glomar_properties_created ON glomar_properties(created_at);
CREATE INDEX IF NOT EXISTS idx_glomar_properties_updated ON glomar_properties(updated_at);
CREATE INDEX IF NOT EXISTS idx_glomar_properties_region ON glomar_properties(region_id_new);
CREATE INDEX IF NOT EXISTS idx_glomar_properties_type ON glomar_properties(property_type_id_new);
CREATE INDEX IF NOT EXISTS idx_glomar_properties_project ON glomar_properties(project);

-- 3. Property Images table
CREATE TABLE IF NOT EXISTS glomar_property_images (
    id VARCHAR(255) PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    name VARCHAR(500),
    bucket_id VARCHAR(255),
    file_id VARCHAR(255),
    image_url TEXT,
    size_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES glomar_properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_glomar_images_property ON glomar_property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_glomar_images_created ON glomar_property_images(created_at);

-- 4. Property Videos table
CREATE TABLE IF NOT EXISTS glomar_property_videos (
    id VARCHAR(255) PRIMARY KEY,
    property_id VARCHAR(255) NOT NULL,
    name VARCHAR(500),
    bucket_id VARCHAR(255),
    file_id VARCHAR(255),
    video_url TEXT,
    size_bytes BIGINT,
    mime_type VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (property_id) REFERENCES glomar_properties(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_glomar_videos_property ON glomar_property_videos(property_id);
CREATE INDEX IF NOT EXISTS idx_glomar_videos_created ON glomar_property_videos(created_at);

-- Comments for documentation
COMMENT ON TABLE glomar_projects IS 'Real estate projects from glomart_data database';
COMMENT ON TABLE glomar_properties IS 'Properties from app.glomartrealestates.com';
COMMENT ON TABLE glomar_property_images IS 'Property images with URLs from remote server';
COMMENT ON TABLE glomar_property_videos IS 'Property videos with URLs from remote server';
