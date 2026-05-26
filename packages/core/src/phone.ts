/**
 * Normalize a phone number to E.164 format.
 * Default country code: Peru (+51)
 */
export function normalizePhone(phone: string, countryCode = '51'): string {
  if (phone.startsWith('+')) return phone
  const digits = phone.replace(/\D/g, '')
  return `+${countryCode}${digits}`
}

/** Strip all non-digit characters */
export function rawPhone(phone: string): string {
  return phone.replace(/\D/g, '')
}
