create extension postgis with schema "extensions";

alter table public."Supplier_Database"
    add column location extensions.geography(Point, 4326);

update public."Supplier_Database"
    set location = ST_SetSRID(ST_MakePoint("Longitude", "Latitude"), 4326)
    WHERE "Latitude" IS NOT NULL AND "Longitude" IS NOT NULL;

create index idx_supplier_location on public."Supplier_Database" using gist(location);

alter table public."Supplier_Database"
    drop column "Latitude",
    drop column "Longitude";