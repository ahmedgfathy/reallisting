    -- Direct SQL Migration from Supabase to Prisma/Contabo
    -- Run this in your Supabase SQL Editor to export data, then in Prisma to import

    -- ===========================================
    -- STEP 1: Export data from Supabase
    -- Run these queries in Supabase SQL Editor and save results
    -- ===========================================

    -- Export users
    COPY (SELECT * FROM users) TO STDOUT WITH CSV HEADER;

    -- Export sender
    COPY (SELECT * FROM sender) TO STDOUT WITH CSV HEADER;

    -- Export regions
    COPY (SELECT * FROM regions) TO STDOUT WITH CSV HEADER;

    -- Export property_types
    COPY (SELECT * FROM property_types) TO STDOUT WITH CSV HEADER;

    -- Export categories
    COPY (SELECT * FROM categories) TO STDOUT WITH CSV HEADER;

    -- Export purposes
    COPY (SELECT * FROM purposes) TO STDOUT WITH CSV HEADER;

    -- Export messages
    COPY (SELECT * FROM messages) TO STDOUT WITH CSV HEADER;
