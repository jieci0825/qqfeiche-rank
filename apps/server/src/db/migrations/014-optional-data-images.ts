export const optionalDataImages = ['drivers', 'cars', 'pets'].map(table => `
    ALTER TABLE ${table} RENAME COLUMN image_file_id TO previous_image_file_id;
    ALTER TABLE ${table} ADD COLUMN image_file_id INTEGER REFERENCES files(id) ON DELETE RESTRICT;
    UPDATE ${table} SET image_file_id = previous_image_file_id;
    ALTER TABLE ${table} DROP COLUMN previous_image_file_id;
`).join('\n')
