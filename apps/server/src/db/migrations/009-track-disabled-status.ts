export const trackDisabledStatusSchema = `
    DROP INDEX idx_tracks_status_sort;

    ALTER TABLE tracks ADD COLUMN new_status TEXT NOT NULL DEFAULT 'active'
        CHECK (new_status IN ('active', 'disabled', 'archived'));
    UPDATE tracks SET new_status = status WHERE status = 'archived';
    ALTER TABLE tracks DROP COLUMN status;
    ALTER TABLE tracks RENAME COLUMN new_status TO status;

    CREATE INDEX idx_tracks_status_sort ON tracks (status, sort_order, id);
`
