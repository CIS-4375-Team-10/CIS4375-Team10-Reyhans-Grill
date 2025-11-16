import crypto from 'node:crypto'

export const generateId = (prefix = '', length = 20) => {
  const raw = crypto.randomBytes(length).toString('hex').toUpperCase()
  const trimmed = raw.slice(0, Math.max(length - prefix.length, 0))
  return `${prefix}${trimmed}`.slice(0, length)
}
