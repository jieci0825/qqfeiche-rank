import type { DatabaseSync } from 'node:sqlite'

export const carEcusSchema = `
    CREATE TABLE car_ecus (
        car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
        position INTEGER NOT NULL CHECK (position >= 0),
        name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
        PRIMARY KEY (car_id, position)
    );
`

export function migrateCarEcus(db: DatabaseSync) {
    const cars = db.prepare('SELECT id, ecu FROM cars').all() as { id: number; ecu: string }[]
    const insert = db.prepare('INSERT INTO car_ecus (car_id, position, name) VALUES (?, ?, ?)')

    for (const { id, ecu } of cars) {
        const names = ecu.split('、').map(name => name.trim()).filter(Boolean)
        if (!names.length) names.push(ecu)
        names.forEach((name, position) => insert.run(id, position, name))
    }

    db.exec('ALTER TABLE cars DROP COLUMN ecu')
}
