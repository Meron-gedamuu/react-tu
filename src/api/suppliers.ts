import axios from 'axios'
import API_BASE_URL from './baseUrl'

export type SupplierRecord = Record<string, unknown>

function isRecord(value: unknown): value is SupplierRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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

export async function getSuppliers(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/header`, {
    params: {
      GslType: 7,
    },
  })

  return response.data
}

export async function getSupplierFormInfo(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/info`, {
    params: {
      reference: 7,
    },
  })

  return response.data
}