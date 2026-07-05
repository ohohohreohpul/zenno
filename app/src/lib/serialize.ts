/**
 * Serialize a lean Mongoose document for JSON responses:
 * stringifies `_id` and drops the internal `__v` version key.
 */
export function serializeDoc<T extends { _id: unknown; __v?: unknown }>(
  doc: T,
): Omit<T, '_id' | '__v'> & { _id: string } {
  const { _id, __v: _version, ...rest } = doc
  return { ...rest, _id: String(_id) }
}
