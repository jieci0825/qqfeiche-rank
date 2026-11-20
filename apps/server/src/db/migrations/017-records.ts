export function createRunsTable(timeColumn: 'time_ms' | 'time_cs') {
    const timeCheck = timeColumn === 'time_ms'
        ? 'time_ms > 0 AND time_ms < 6000000'
        : "typeof(time_cs) = 'integer' AND time_cs > 0 AND time_cs < 600000"

    return `
    CREATE TABLE runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE RESTRICT,
        driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE RESTRICT,
        team_id INTEGER REFERENCES teams(id) ON DELETE RESTRICT,
        car_id INTEGER REFERENCES cars(id) ON DELETE RESTRICT,
        pet_id INTEGER REFERENCES pets(id) ON DELETE RESTRICT,
        ecu TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(ecu) AND json_type(ecu) = 'array'),
        ${timeColumn} INTEGER NOT NULL CHECK (${timeCheck}),
        achieved_at TEXT NOT NULL,
        screenshot_file_id INTEGER REFERENCES files(id) ON DELETE RESTRICT,
        video_url TEXT,
        note TEXT,
        status TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid', 'voided')),
        void_reason TEXT CHECK (void_reason IN ('bug', 'reset', 'cheat', 'boost', 'mistake', 'other')),
        void_note TEXT,
        voided_at TEXT,
        voided_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL,
        created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        CHECK ((status = 'valid' AND void_reason IS NULL AND voided_at IS NULL)
            OR (status = 'voided' AND void_reason IS NOT NULL AND voided_at IS NOT NULL)),
        CHECK (void_reason IS NOT 'other' OR length(trim(coalesce(void_note, ''))) > 0),
        UNIQUE (track_id, driver_id, ${timeColumn}, achieved_at),
        UNIQUE (track_id, id)
    );
    `
}

export const recordVersionsSchema = `
    CREATE TABLE record_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE RESTRICT,
        run_id INTEGER NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('set', 'restore')),
        previous_version_id INTEGER,
        trigger_run_id INTEGER,
        created_at TEXT NOT NULL,
        created_by INTEGER REFERENCES admins(id) ON DELETE SET NULL,
        UNIQUE (track_id, id),
        FOREIGN KEY (track_id, run_id) REFERENCES runs(track_id, id),
        FOREIGN KEY (track_id, previous_version_id) REFERENCES record_versions(track_id, id),
        FOREIGN KEY (track_id, trigger_run_id) REFERENCES runs(track_id, id),
        CHECK ((kind = 'set' AND trigger_run_id IS NULL) OR
            (kind = 'restore' AND trigger_run_id IS NOT NULL AND previous_version_id IS NOT NULL))
    );
    CREATE INDEX idx_record_versions_run ON record_versions (run_id, id DESC);
`

export const recordsSchema = `
    ${createRunsTable('time_ms')}
    ${recordVersionsSchema}
    INSERT INTO permissions (code, menu_id, label, kind)
    SELECT actions.code, menus.id, actions.label, 'action'
    FROM menus CROSS JOIN (
        SELECT 'records:create' AS code, '录入成绩' AS label
        UNION ALL SELECT 'records:update', '编辑成绩资料'
        UNION ALL SELECT 'records:void', '作废成绩'
    ) AS actions
    WHERE menus.key = 'records';
`
