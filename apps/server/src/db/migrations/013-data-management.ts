const recordColumns = `
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
`

export const dataManagementSchema = `
    CREATE TABLE teams (${recordColumns});

    CREATE TABLE drivers (
        ${recordColumns},
        image_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
        team_id INTEGER REFERENCES teams(id) ON DELETE RESTRICT
    );
    CREATE INDEX idx_drivers_team ON drivers (team_id);

    CREATE TABLE cars (
        ${recordColumns},
        image_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE RESTRICT,
        ecu TEXT NOT NULL CHECK (length(trim(ecu)) BETWEEN 1 AND 100)
    );

    CREATE TABLE pets (
        ${recordColumns},
        image_file_id INTEGER NOT NULL REFERENCES files(id) ON DELETE RESTRICT
    );

    WITH resources(key, label) AS (
        VALUES ('teams', '车队'), ('drivers', '车手'), ('cars', '赛车'), ('pets', '宠物')
    ), actions(action, label) AS (
        VALUES ('create', '新增'), ('update', '编辑'), ('archive', '归档')
    )
    INSERT INTO permissions (code, menu_id, label, kind)
    SELECT resources.key || ':' || actions.action, menus.id, actions.label || resources.label, 'action'
    FROM resources JOIN menus ON menus.key = resources.key CROSS JOIN actions;
`
