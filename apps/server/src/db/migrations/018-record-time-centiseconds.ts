import { createRunsTable, recordVersionsSchema } from './017-records.ts'

export const recordTimeCentiseconds = `
    ALTER TABLE runs RENAME TO runs_before_centiseconds;
    ALTER TABLE record_versions RENAME TO record_versions_before_centiseconds;
    DROP INDEX idx_record_versions_run;

    ${createRunsTable('time_cs')}
    ${recordVersionsSchema}

    -- 拒绝有毫秒个位精度的旧成绩，避免转换时丢失数据。
    INSERT INTO runs (id, track_id, driver_id, team_id, car_id, pet_id, ecu, time_cs, achieved_at,
        screenshot_file_id, video_url, note, status, void_reason, void_note, voided_at, voided_by, created_at, created_by)
    SELECT id, track_id, driver_id, team_id, car_id, pet_id, ecu,
        CASE WHEN typeof(time_ms) = 'integer' AND time_ms % 10 = 0 THEN time_ms / 10 END,
        achieved_at, screenshot_file_id, video_url, note, status, void_reason, void_note, voided_at, voided_by, created_at, created_by
    FROM runs_before_centiseconds;

    INSERT INTO record_versions (id, track_id, run_id, kind, previous_version_id, trigger_run_id, created_at, created_by)
    SELECT id, track_id, run_id, kind, previous_version_id, trigger_run_id, created_at, created_by
    FROM record_versions_before_centiseconds;

    DELETE FROM sqlite_sequence WHERE name IN ('runs', 'record_versions');
    UPDATE sqlite_sequence SET name = 'runs' WHERE name = 'runs_before_centiseconds';
    UPDATE sqlite_sequence SET name = 'record_versions' WHERE name = 'record_versions_before_centiseconds';

    DROP TABLE record_versions_before_centiseconds;
    DROP TABLE runs_before_centiseconds;
`
