/** Matches Django `Employee.full_name` and `EmailField` limits. */
export const EMPLOYEE_FULL_NAME_MAX = 100
export const EMPLOYEE_EMAIL_MAX = 254

/** Unicode letters and spaces only */
const FULL_NAME_PATTERN = /^[\p{L}\s]+$/u

export function validateEmployeeFullName(value: string): string | undefined {
  const name = value.trim()
  if (!name) return 'Full name is required'
  if (name.length < 2) return 'Full name must be at least 2 characters'
  if (name.length > EMPLOYEE_FULL_NAME_MAX) {
    return `Full name must be at most ${EMPLOYEE_FULL_NAME_MAX} characters`
  }
  if (!FULL_NAME_PATTERN.test(name)) {
    return 'Use only letters and spaces'
  }
  return undefined
}

export function validateEmployeeEmail(value: string): string | undefined {
  const email = value.trim().toLowerCase()
  if (!email) return 'Email is required'
  if (email.length > EMPLOYEE_EMAIL_MAX) {
    return `Email must be at most ${EMPLOYEE_EMAIL_MAX} characters`
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return 'Please enter a valid email address'
  }
  return undefined
}
