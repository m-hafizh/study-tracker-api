export const encodeCursor = (value: string) => Buffer.from(value, 'utf8').toString('base64url');

export const decodeCursor = (cursor: string) => Buffer.from(cursor, 'base64url').toString('utf8');
