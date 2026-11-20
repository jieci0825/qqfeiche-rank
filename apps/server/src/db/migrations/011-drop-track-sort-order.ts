export const dropTrackSortOrder = `
    DROP INDEX idx_tracks_status_sort;
    ALTER TABLE tracks DROP COLUMN sort_order;
`
