-- Exact replica of MariaDB glomart_data schema for Supabase
-- All tables with exact same structure

DROP TABLE IF EXISTS glomar_properties_videos CASCADE;
DROP TABLE IF EXISTS glomar_properties_images CASCADE;
DROP TABLE IF EXISTS glomar_properties CASCADE;
DROP TABLE IF EXISTS glomar_filtersettings CASCADE;
DROP TABLE IF EXISTS glomar_unit_facilities CASCADE;
DROP TABLE IF EXISTS glomar_finishing_levels CASCADE;
DROP TABLE IF EXISTS glomar_property_statuses CASCADE;
DROP TABLE IF EXISTS glomar_property_purposes CASCADE;
DROP TABLE IF EXISTS glomar_property_categories CASCADE;
DROP TABLE IF EXISTS glomar_property_types CASCADE;
DROP TABLE IF EXISTS glomar_regions CASCADE;
DROP TABLE IF EXISTS glomar_currencies CASCADE;
DROP TABLE IF EXISTS glomar_countries CASCADE;

-- countries
CREATE TABLE glomar_countries (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    code TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_countries_created ON glomar_countries(created_at);
CREATE INDEX idx_glomar_countries_updated ON glomar_countries(updated_at);

-- currencies
CREATE TABLE glomar_currencies (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    code TEXT,
    name TEXT,
    symbol TEXT,
    exchange_rate DECIMAL(15,4),
    is_base_currency BOOLEAN,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_currencies_created ON glomar_currencies(created_at);
CREATE INDEX idx_glomar_currencies_updated ON glomar_currencies(updated_at);

-- regions
CREATE TABLE glomar_regions (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    country_id TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_regions_created ON glomar_regions(created_at);
CREATE INDEX idx_glomar_regions_updated ON glomar_regions(updated_at);

-- property_types
CREATE TABLE glomar_property_types (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    description TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_property_types_created ON glomar_property_types(created_at);
CREATE INDEX idx_glomar_property_types_updated ON glomar_property_types(updated_at);

-- property_categories
CREATE TABLE glomar_property_categories (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    description TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_property_categories_created ON glomar_property_categories(created_at);
CREATE INDEX idx_glomar_property_categories_updated ON glomar_property_categories(updated_at);

-- property_purposes
CREATE TABLE glomar_property_purposes (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    description TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_property_purposes_created ON glomar_property_purposes(created_at);
CREATE INDEX idx_glomar_property_purposes_updated ON glomar_property_purposes(updated_at);

-- property_statuses
CREATE TABLE glomar_property_statuses (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    color_code TEXT,
    description TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_property_statuses_created ON glomar_property_statuses(created_at);
CREATE INDEX idx_glomar_property_statuses_updated ON glomar_property_statuses(updated_at);

-- finishing_levels
CREATE TABLE glomar_finishing_levels (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    description TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_finishing_levels_created ON glomar_finishing_levels(created_at);
CREATE INDEX idx_glomar_finishing_levels_updated ON glomar_finishing_levels(updated_at);

-- unit_facilities
CREATE TABLE glomar_unit_facilities (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    name TEXT,
    category TEXT,
    description TEXT,
    display_order BIGINT,
    is_active BOOLEAN,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_unit_facilities_created ON glomar_unit_facilities(created_at);
CREATE INDEX idx_glomar_unit_facilities_updated ON glomar_unit_facilities(updated_at);

-- filtersettings
CREATE TABLE glomar_filtersettings (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    leadsettings TEXT,
    unitsettings TEXT,
    sequence BIGINT,
    permissions JSONB,
    databaseid TEXT,
    collectionid TEXT
);
CREATE INDEX idx_glomar_filtersettings_created ON glomar_filtersettings(created_at);
CREATE INDEX idx_glomar_filtersettings_updated ON glomar_filtersettings(updated_at);

-- properties (master table)
CREATE TABLE glomar_properties (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    building TEXT,
    propertynumber TEXT,
    thefloors TEXT,
    unitfeatures TEXT,
    phase TEXT,
    note TEXT,
    inoroutsidecompound TEXT,
    description TEXT,
    lastfollowin TEXT,
    status TEXT,
    propertyofferedby TEXT,
    name TEXT,
    unitno TEXT,
    callupdate TEXT,
    forupdate TEXT,
    handler TEXT,
    sales TEXT,
    modifiedtime TEXT,
    landarea TEXT,
    rentfrom TEXT,
    rentto TEXT,
    compoundname TEXT,
    liked BOOLEAN,
    inhome BOOLEAN,
    rooms DECIMAL(15,4),
    mobileno TEXT,
    totalprice DECIMAL(15,4),
    pricepermeter DECIMAL(15,4),
    propertyimage TEXT,
    videos TEXT,
    tel TEXT,
    users TEXT,
    project TEXT,
    installment TEXT,
    payedevery TEXT,
    monthly TEXT,
    createdtime TEXT,
    downpayment DECIMAL(15,4),
    spaceeerth TEXT,
    spaceunit TEXT,
    spaceguard TEXT,
    title TEXT,
    price TEXT,
    location TEXT,
    images TEXT,
    region_id_new TEXT,
    property_type_id_new TEXT,
    finishing_level_id_new TEXT,
    currency_id_new TEXT,
    category_id_new TEXT,
    unit_facility_id_new TEXT,
    unit_purpose_id_new TEXT,
    region_name TEXT,
    country_name TEXT,
    property_type_name TEXT,
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
    _sequence DECIMAL(15,4),
    _permissions TEXT,
    _databaseid TEXT,
    _collectionid TEXT
);
CREATE INDEX idx_glomar_properties_created ON glomar_properties(created_at);
CREATE INDEX idx_glomar_properties_updated ON glomar_properties(updated_at);

-- properties_images
CREATE TABLE glomar_properties_images (
    id TEXT PRIMARY KEY,
    name TEXT,
    bucket_id TEXT,
    file_id TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
CREATE INDEX idx_glomar_properties_images_bucket ON glomar_properties_images(bucket_id);
CREATE INDEX idx_glomar_properties_images_created ON glomar_properties_images(created_at);

-- properties_videos
CREATE TABLE glomar_properties_videos (
    id TEXT PRIMARY KEY,
    name TEXT,
    bucket_id TEXT,
    file_id TEXT,
    size_bytes BIGINT,
    mime_type TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
CREATE INDEX idx_glomar_properties_videos_bucket ON glomar_properties_videos(bucket_id);
CREATE INDEX idx_glomar_properties_videos_created ON glomar_properties_videos(created_at);
