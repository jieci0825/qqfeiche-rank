import type { DatabaseSync } from 'node:sqlite'

export interface UploadedFile {
    objectKey: string
    originalName: string | null
    contentType: string
    sizeBytes: number
}

export function createFileStore(db: DatabaseSync) {
    const insert = db.prepare(`
        INSERT INTO files (object_key, original_name, content_type, size_bytes, uploaded_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (object_key) DO NOTHING
        RETURNING id
    `)
    const byObjectKey = db.prepare('SELECT id FROM files WHERE object_key = ?')

    return {
        registerUpload(file: UploadedFile, adminId: number, now: string) {
            const { objectKey, originalName, contentType, sizeBytes } = file
            const row = (insert.get(objectKey, originalName, contentType, sizeBytes, adminId, now) ??
                byObjectKey.get(objectKey)) as { id: number }
            return row.id
        },
    }
}
