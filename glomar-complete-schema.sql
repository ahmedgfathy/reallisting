    -- Complete Glomar Properties Schema with all reference tables
    DROP TABLE IF EXISTS glomar_property_videos CASCADE;
    DROP TABLE IF EXISTS glomar_property_images CASCADE;
    DROP TABLE IF EXISTS glomar_properties CASCADE;
    DROP TABLE IF EXISTS glomar_unit_facilities CASCADE;
    DROP TABLE IF EXISTS glomar_regions CASCADE;
    DROP TABLE IF EXISTS glomar_property_types CASCADE;
    DROP TABLE IF EXISTS glomar_property_statuses CASCADE;
    DROP TABLE IF EXISTS glomar_property_purposes CASCADE;
    DROP TABLE IF EXISTS glomar_property_categories CASCADE;
    DROP TABLE IF EXISTS glomar_finishing_levels CASCADE;
    DROP TABLE IF EXISTS glomar_filtersettings CASCADE;
    DROP TABLE IF EXISTS glomar_currencies CASCADE;
    DROP TABLE IF EXISTS glomar_countries CASCADE;
    DROP TABLE IF EXISTS glomar_projects CASCADE;

    -- Reference/Lookup Tables (all columns as TEXT for simplicity)

    CREATE TABLE glomar_countries (
        id TEXT PRIMARY KEY,
        name TEXT,
        code TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_currencies (
        id TEXT PRIMARY KEY,
        name TEXT,
        code TEXT,
        symbol TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_regions (
        id TEXT PRIMARY KEY,
        name TEXT,
        country_id TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_property_types (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_property_categories (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_property_purposes (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_property_statuses (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_finishing_levels (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_unit_facilities (
        id TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    CREATE TABLE glomar_filtersettings (
        id TEXT PRIMARY KEY,
        filter_data TEXT,
        created_at TEXT,
        updated_at TEXT
    );

    -- Main Properties Table
    CREATE TABLE glomar_properties (
        id TEXT PRIMARY KEY,
        created_at TEXT,
        updated_at TEXT,
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
        liked TEXT,
        inhome TEXT,
        rooms TEXT,
        mobileno TEXT,
        totalprice TEXT,
        pricepermeter TEXT,
        propertyimage TEXT,
        videos TEXT,
        tel TEXT,
        users TEXT,
        project TEXT,
        installment TEXT,
        payedevery TEXT,
        monthly TEXT,
        createdtime TEXT,
        downpayment TEXT,
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
        _sequence TEXT,
        _permissions TEXT,
        _databaseid TEXT,
        _collectionid TEXT
    );

    CREATE INDEX idx_glomar_properties_created ON glomar_properties(created_at);
    CREATE INDEX idx_glomar_properties_region ON glomar_properties(region_id_new);
    CREATE INDEX idx_glomar_properties_type ON glomar_properties(property_type_id_new);

    -- Property Media Tables
    CREATE TABLE glomar_property_images (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        name TEXT,
        bucket_id TEXT,
        file_id TEXT,
        image_url TEXT,
        size_bytes BIGINT,
        mime_type TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (property_id) REFERENCES glomar_properties(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_glomar_images_property ON glomar_property_images(property_id);

    CREATE TABLE glomar_property_videos (
        id TEXT PRIMARY KEY,
        property_id TEXT NOT NULL,
        name TEXT,
        bucket_id TEXT,
        file_id TEXT,
        video_url TEXT,
        size_bytes BIGINT,
        mime_type TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (property_id) REFERENCES glomar_properties(id) ON DELETE CASCADE
    );

    CREATE INDEX idx_glomar_videos_property ON glomar_property_videos(property_id);
