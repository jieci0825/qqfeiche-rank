export const filesSchema = `
    CREATE TABLE files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        object_key TEXT NOT NULL UNIQUE,
        original_name TEXT,
        content_type TEXT,
        size_bytes INTEGER CHECK (size_bytes > 0),
        uploaded_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL
    );

    ALTER TABLE tracks ADD COLUMN cover_file_id INTEGER REFERENCES files(id) ON DELETE RESTRICT;
    ALTER TABLE tracks DROP COLUMN cover_key;
    ALTER TABLE tracks DROP COLUMN cover_url;
    CREATE INDEX idx_tracks_cover_file_id ON tracks (cover_file_id);
`
