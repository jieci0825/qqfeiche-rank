export const trackClassificationSchema = `
    ALTER TABLE tracks ADD COLUMN stars INTEGER
        CHECK (typeof(stars) = 'null' OR (typeof(stars) = 'integer' AND stars BETWEEN 1 AND 7));

    ALTER TABLE tracks ADD COLUMN categories TEXT NOT NULL DEFAULT '[]'
        CHECK (json_valid(categories) AND json_type(categories) = 'array');
`
