export const teamsMenu = `
    INSERT INTO menus (key, parent_id, title, path, icon, sort_order)
    VALUES ('teams', (SELECT id FROM menus WHERE key = 'data'), '车队管理', '/teams', 'ep:flag', 50);

    INSERT INTO permissions (code, menu_id, label, kind)
    VALUES ('teams:read', (SELECT id FROM menus WHERE key = 'teams'), '查看车队', 'page');
`
