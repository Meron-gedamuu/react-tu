import axios from 'axios'
import API_BASE_URL from './baseUrl'

export type SupplierRecord = Record<string, unknown>
export type SupplierOption = {
  code: string
  description: string
}
export type SupplierCreateData = {
  type: 7
  tradeName: string
  brandName: string
  businessType: 'LKUP000000121'
  preference: 'PREFE000001057'
  isActive: boolean
  remark: string
  organizationUnit: 'OUD100007979'
  tax: string
  orgUnitDef: 'OUD100007979'
  activitiyDefinition: 'AD-000000009'
  objectStateDefinition: string[]
  user: 'User000000037'
  identification: { idNumber: string }
  address: unknown[]
  relation: unknown[]
}
export interface SupplierUpdateData extends SupplierCreateData {
  code: string
}
function isRecord(value: unknown): value is SupplierRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function getSupplierOptions(payload: unknown): SupplierOption[] {
  if (!Array.isArray(payload)) return []

  const options = payload.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const code = entry.code ?? entry.Code
    const description = entry.description ?? entry.Description
    if ((typeof code !== 'string' && typeof code !== 'number') || typeof description !== 'string') {
      return []
    }

    const normalizedCode = String(code).trim()
    const normalizedDescription = description.trim()
    return normalizedCode && normalizedDescription
      ? [{ code: normalizedCode, description: normalizedDescription }]
      : []
  })

  return [...new Map(options.map((option) => [option.code, option])).values()]
    .sort((first, second) => first.description.localeCompare(second.description))
}

export function extractSuppliers(payload: unknown): SupplierRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  for (const key of ['data', 'items', 'suppliers', 'results', 'result', 'organizations']) {
    const nested = payload[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
    if (isRecord(nested)) {
      const suppliers = extractSuppliers(nested)
      if (suppliers.length > 0) return suppliers
    }
  }

  return [payload]
}

export async function getCustomers(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/header`, {
    params: {
      GslType: 7,
    },
  })

  const contentType = response.headers['content-type']
  if (typeof contentType !== 'string' || !contentType.toLowerCase().includes('application/json')) {
    throw new Error(
      `Customer lookup expected a JSON response but received ${contentType || 'an unknown content type'}.`,
    )
  }

  return response.data
}

export async function getSuppliers(): Promise<unknown> {
  return getCustomers()
}

export async function getSupplierFormInfo(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/info`, {
    params: {
      reference: 7,
    },
  })

  return response.data
}

export async function createSupplier(data: SupplierCreateData): Promise<unknown> {
  const response = await axios.post(`${API_BASE_URL}organization`, data)
  return response.data
}
export async function updateSupplier(data: SupplierUpdateData): Promise<unknown> {
  const { code, ...updateData } = data
  const response = await axios.put(`${API_BASE_URL}organization/${code}`, updateData)
  return response.data
}