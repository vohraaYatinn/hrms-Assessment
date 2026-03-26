import { backendBaseUrl } from './environment.js'

/**
 * @typedef {'present' | 'absent'} AttendanceStatus
 */

/**
 * @typedef {Object} Employee
 * @property {string} id
 * @property {string} employeeId
 * @property {string} fullName
 * @property {string} email
 * @property {string} department
 * @property {string} createdAt
 */

/**
 * @typedef {Object} AttendanceRecord
 * @property {string} id
 * @property {string} employeeId
 * @property {string} date
 * @property {AttendanceStatus} status
 */

const UNKNOWN_OR_REMOVED_EMPLOYEE_MESSAGE =
  'Maybe this employee was deleted or is inactive. Please check the Employees tab.'

/**
 * Liveness check for waking cold-hosted backends (e.g. Render free tier).
 * @param {number} [timeoutMs] — abort the request after this many ms
 * @returns {Promise<boolean>}
 */
export async function fetchBackendHealth(timeoutMs = 20000) {
  const controller = new AbortController()
  const t = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${backendBaseUrl}/api/health/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      // Older backends without this route: do not block the app on the wake screen.
      if (response.status === 404) return true
      return false
    }
    const payload = await response.json().catch(() => ({}))
    return payload?.success === true
  } catch {
    return false
  } finally {
    window.clearTimeout(t)
  }
}

/** Thrown on non-OK API responses (includes HTTP status and server error code when present). */
export class ApiRequestError extends Error {
  /**
   * @param {string} message
   * @param {{ code?: string, httpStatus?: number }} [meta]
   */
  constructor(message, meta = {}) {
    super(message)
    this.name = 'ApiRequestError'
    this.code = meta.code ?? undefined
    this.httpStatus = meta.httpStatus ?? undefined
  }
}

/**
 * @param {Record<string, unknown> | undefined} details
 * @param {string} message
 */
function isUnknownEmployeeIdsError(details, message) {
  if (typeof message === 'string' && message.includes('Unknown employee id')) {
    return true
  }
  const emp = details && typeof details === 'object' ? details.employee_ids : undefined
  if (typeof emp === 'string' && emp.includes('Unknown employee id')) {
    return true
  }
  if (Array.isArray(emp) && emp.some((x) => String(x).includes('Unknown employee id'))) {
    return true
  }
  return false
}

async function apiRequest(path, init = {}) {
  let response
  try {
    response = await fetch(`${backendBaseUrl}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
      ...init,
    })
  } catch (err) {
    if (err instanceof ApiRequestError) throw err
    throw new Error(`Unable to connect to backend at ${backendBaseUrl}`)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const errCode = payload?.error?.code
    const details = payload?.error?.details
    const detailMessage =
      typeof details?.detail === 'string'
        ? details.detail
        : Array.isArray(details?.non_field_errors)
          ? details.non_field_errors.join(', ')
          : undefined
    const message =
      payload?.message ||
      payload?.error?.message ||
      payload?.detail ||
      detailMessage ||
      'Request failed. Please try again.'
    if (isUnknownEmployeeIdsError(details, message)) {
      throw new ApiRequestError(UNKNOWN_OR_REMOVED_EMPLOYEE_MESSAGE, {
        code: 'UNKNOWN_EMPLOYEE_IDS',
        httpStatus: response.status,
      })
    }
    throw new ApiRequestError(message, {
      code: typeof errCode === 'string' ? errCode : undefined,
      httpStatus: response.status,
    })
  }

  // Support both response shapes:
  // 1) { success: true, data: ... }
  // 2) raw object/array from backend
  return payload?.data !== undefined ? payload.data : payload
}

function normalizeList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.results)) return data.results
  return []
}

function mapEmployee(apiEmployee) {
  const departmentLabelMap = {
    ENGINEERING: 'Engineering',
    DESIGN: 'Design',
    PRODUCT: 'Product',
    MARKETING: 'Marketing',
    HR: 'HR',
    FINANCE: 'Finance',
    OPERATIONS: 'Operations',
  }

  return {
    id: String(apiEmployee?.id ?? ''),
    employeeId: apiEmployee?.employee_id ?? apiEmployee?.employeeId ?? '',
    fullName: apiEmployee?.full_name ?? apiEmployee?.fullName ?? '',
    email: apiEmployee?.email ?? '',
    department:
      departmentLabelMap[apiEmployee?.department] ??
      apiEmployee?.department ??
      '',
    createdAt:
      apiEmployee?.created_at ??
      apiEmployee?.createdAt ??
      new Date().toISOString(),
  }
}

function mapDepartmentToApi(department) {
  const apiDepartmentMap = {
    Engineering: 'ENGINEERING',
    Design: 'DESIGN',
    Product: 'PRODUCT',
    Marketing: 'MARKETING',
    HR: 'HR',
    Finance: 'FINANCE',
    Operations: 'OPERATIONS',
  }
  return apiDepartmentMap[department] ?? String(department).toUpperCase()
}

function mapAttendance(apiAttendance) {
  return {
    id: String(apiAttendance.id),
    employeeId: String(apiAttendance.employee),
    date: apiAttendance.date,
    status: String(apiAttendance.status).toLowerCase(),
  }
}

function buildEmployeesQueryString(params = {}) {
  const sp = new URLSearchParams()
  if (params.page != null) sp.set('page', String(params.page))
  if (params.pageSize != null) sp.set('page_size', String(params.pageSize))
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.department) {
    const code = mapDepartmentToApi(params.department)
    if (code) sp.set('department', code)
  }
  if (params.ordering) sp.set('ordering', params.ordering)
  if (params.employeeId?.trim()) sp.set('employee_id', params.employeeId.trim())
  if (params.attendanceDate?.trim()) {
    sp.set('attendance_date', params.attendanceDate.trim())
  }
  const st = params.attendanceStatus?.trim().toLowerCase()
  if (st === 'present' || st === 'absent') {
    sp.set('attendance_status', st)
  }
  return sp.toString()
}

/**
 * One page of employees from the server (pagination + filters).
 * @param {{ page?: number, pageSize?: number, search?: string, department?: string, ordering?: string, employeeId?: string, attendanceDate?: string, attendanceStatus?: 'present' | 'absent' }} [params]
 */
export async function fetchEmployeesPage(params = {}) {
  const qs = buildEmployeesQueryString(params)
  const path = qs ? `/api/employees/?${qs}` : '/api/employees/'
  const data = await apiRequest(path)
  const rawResults = Array.isArray(data) ? data : data?.results ?? []
  const employees = rawResults.map(mapEmployee)
  const count = typeof data?.count === 'number' ? data.count : employees.length
  return {
    employees,
    count,
    next: data?.next ?? null,
    previous: data?.previous ?? null,
  }
}

/**
 * All employees (follows pagination until the full list is loaded).
 */
export async function fetchAllEmployees() {
  const pageSize = 200
  const all = []
  let page = 1
  while (true) {
    const { employees, count } = await fetchEmployeesPage({ page, pageSize })
    all.push(...employees)
    if (all.length >= count || employees.length === 0) break
    page += 1
  }
  return all
}

/** Single employee by primary key (API id). */
export async function fetchEmployee(id) {
  const data = await apiRequest(`/api/employees/${id}/`)
  return mapEmployee(data)
}

/** Full employee list for dashboard / provider sync (server-side pagination under the hood). */
export async function fetchEmployees() {
  return fetchAllEmployees()
}

/**
 * All employees matching optional search / department filters (paged fetches under the hood).
 * @param {{ search?: string, department?: string, attendanceDate?: string, attendanceStatus?: 'present' | 'absent' }} [params]
 */
export async function fetchAllEmployeesMatching(params = {}) {
  const search = params.search
  const department = params.department
  const attendanceDate = params.attendanceDate
  const attendanceStatus = params.attendanceStatus
  const pageSize = 200
  const all = []
  let page = 1
  while (true) {
    const { employees, count } = await fetchEmployeesPage({
      page,
      pageSize,
      search: search?.trim() || undefined,
      department,
      ordering: 'full_name,employee_id',
      attendanceDate: attendanceDate?.trim() || undefined,
      attendanceStatus,
    })
    all.push(...employees)
    if (all.length >= count || employees.length === 0) break
    page += 1
  }
  return all
}

export async function createEmployee(employee) {
  const data = await apiRequest('/api/employees/', {
    method: 'POST',
    body: JSON.stringify({
      full_name: employee.fullName,
      email: employee.email,
      department: mapDepartmentToApi(employee.department),
    }),
  })
  return mapEmployee(data)
}

export async function updateEmployee(id, employee) {
  const data = await apiRequest(`/api/employees/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify({
      full_name: employee.fullName,
      email: employee.email,
      department: mapDepartmentToApi(employee.department),
    }),
  })
  return mapEmployee(data)
}

export async function removeEmployee(id) {
  await apiRequest(`/api/employees/${id}/`, { method: 'DELETE' })
}

/** Create ``count`` demo employees on the server (unique demo emails). */
export async function createDemoEmployees(count) {
  return apiRequest('/api/employees/demo/', {
    method: 'POST',
    body: JSON.stringify({ count }),
  })
}

/** Delete all employees (attendance for them is removed via cascade). */
export async function deleteAllEmployees() {
  return apiRequest('/api/employees/purge/', { method: 'DELETE' })
}

export async function fetchAttendance() {
  const data = await apiRequest('/api/attendance/')
  return normalizeList(data).map(mapAttendance)
}

/**
 * Attendance rows for one employee. ``businessEmployeeId`` is the human-readable id (e.g. EMP001).
 */
export async function fetchAttendanceByEmployeeBusinessId(businessEmployeeId) {
  const qs = new URLSearchParams({
    employee_id: String(businessEmployeeId).trim(),
  })
  const data = await apiRequest(`/api/attendance/?${qs.toString()}`)
  return normalizeList(data).map(mapAttendance)
}

/** All attendance rows for a single date (used for roster / bulk workflows). */
export async function fetchAttendanceByDate(date) {
  const data = await apiRequest(
    `/api/attendance/by_date/?date=${encodeURIComponent(date)}`,
  )
  return normalizeList(data).map(mapAttendance)
}

/** Attendance rows from ``startDate`` through ``endDate`` (inclusive, YYYY-MM-DD). */
export async function fetchAttendanceByRange(startDate, endDate) {
  const qs = new URLSearchParams({
    start_date: startDate,
    end_date: endDate,
  })
  const data = await apiRequest(`/api/attendance/by_range/?${qs.toString()}`)
  return normalizeList(data).map(mapAttendance)
}

/**
 * @param {{
 *   date: string,
 *   status: 'present' | 'absent',
 *   employeeIds?: string[],
 *   employeeExpectations?: { employeeId: string, expectedCurrentStatus: 'present' | 'absent' | null }[],
 * }} payload
 * Omit ``employeeIds`` to apply status to every employee (expectations are not applied).
 */
export async function bulkAttendance(payload) {
  const body = {
    date: payload.date,
    status: payload.status.toUpperCase(),
  }
  if (payload.employeeIds !== undefined) {
    body.employee_ids = payload.employeeIds.map((id) => Number(id))
  }
  if (payload.employeeExpectations?.length) {
    body.employee_expectations = payload.employeeExpectations.map((row) => ({
      employee_id: Number(row.employeeId),
      expected_current_status:
        row.expectedCurrentStatus == null
          ? null
          : String(row.expectedCurrentStatus).toUpperCase(),
    }))
  }
  return apiRequest('/api/attendance/bulk/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function createAttendance(payload) {
  const body = {
    employee: Number(payload.employeeId),
    date: payload.date,
    status: payload.status.toUpperCase(),
  }
  if (payload.expectedCurrentStatus !== undefined) {
    body.expected_current_status =
      payload.expectedCurrentStatus == null
        ? null
        : String(payload.expectedCurrentStatus).toUpperCase()
  }
  const data = await apiRequest('/api/attendance/', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return mapAttendance(data)
}

export async function updateAttendance(id, payload) {
  const body = {}
  if (payload.date != null) body.date = payload.date
  if (payload.status != null) body.status = String(payload.status).toUpperCase()
  if (payload.expectedCurrentStatus !== undefined) {
    body.expected_current_status =
      payload.expectedCurrentStatus == null
        ? null
        : String(payload.expectedCurrentStatus).toUpperCase()
  }
  const data = await apiRequest(`/api/attendance/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
  return mapAttendance(data)
}

export async function removeAttendance(id) {
  await apiRequest(`/api/attendance/${id}/`, { method: 'DELETE' })
}

/**
 * Mark all employees for the last ``days`` calendar days before today (demo data).
 * @param {number} days
 * @param {'present' | 'absent' | 'random'} [status]
 */
export async function createDemoPastAttendance(days, status = 'present') {
  return apiRequest('/api/attendance/demo_past/', {
    method: 'POST',
    body: JSON.stringify({
      days,
      status: status.toUpperCase(),
    }),
  })
}

/** Delete every attendance record (employees unchanged). */
export async function deleteAllAttendance() {
  return apiRequest('/api/attendance/purge/', { method: 'DELETE' })
}
