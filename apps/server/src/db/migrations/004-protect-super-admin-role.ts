import { superAdminRoleCode } from '../../modules/rbac/rbac.catalog.ts'

// REPLACE can remove a conflicting row without firing its DELETE trigger.
export const superAdminRoleProtection = `
    CREATE TRIGGER protect_super_admin_role_insert
    BEFORE INSERT ON roles
    WHEN NEW.code = '${superAdminRoleCode}'
        OR NEW.id = (SELECT id FROM roles WHERE code = '${superAdminRoleCode}')
    BEGIN
        SELECT RAISE(ABORT, 'Super admin role is immutable');
    END;

    CREATE TRIGGER protect_super_admin_role_update
    BEFORE UPDATE ON roles
    WHEN OLD.code = '${superAdminRoleCode}' OR NEW.code = '${superAdminRoleCode}'
        OR NEW.id = (SELECT id FROM roles WHERE code = '${superAdminRoleCode}')
    BEGIN
        SELECT RAISE(ABORT, 'Super admin role is immutable');
    END;

    CREATE TRIGGER protect_super_admin_role_delete
    BEFORE DELETE ON roles
    WHEN OLD.code = '${superAdminRoleCode}'
    BEGIN
        SELECT RAISE(ABORT, 'Super admin role is immutable');
    END;
`
