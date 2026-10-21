import axios from 'axios'
import API_BASE_URL from './baseUrl'

export type EmployeeRecord = Record<string, unknown>

export const DEFAULT_EMPLOYEE_BRANCH_CODE = 'OUD100007979'

export function getEmployeeBranchCode(): string {
  return import.meta.env.VITE_EMPLOYEE_BRANCH_CODE?.trim() || DEFAULT_EMPLOYEE_BRANCH_CODE
}

function isRecord(value: unknown): value is EmployeeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractEmployees(payload: unknown): EmployeeRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  for (const key of ['data', 'items', 'employees', 'results', 'result']) {
    const nested = payload[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
    if (isRecord(nested)) {
      const employees = extractEmployees(nested)
      if (employees.length > 0) return employees
    }
  }

  return []
}

export async function getEmployees(
  branchCode = getEmployeeBranchCode(),
): Promise<EmployeeRecord[]> {
  if (!branchCode) {
    throw new Error('An employee branch code must be configured.')
  }

  const response = await axios.get(`${API_BASE_URL}user`, {
    params: {
      branch: branchCode,
    },
  })

  const contentType = response.headers['content-type']
  if (typeof contentType !== 'string' || !contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      `Employee lookup expected a JSON response but received ${contentType || 'an unknown content type'}.`,
    )
  }

  const employees = extractEmployees(response.data)
  if (employees.length === 0 && !Array.isArray(response.data)) {
    throw new Error('Employee lookup returned an unexpected response format.')
  }

  return employees
}
