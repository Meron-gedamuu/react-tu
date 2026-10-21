import axios from 'axios'
import API_BASE_URL from './baseUrl'

export type CustomerRecord = Record<string, unknown>

function isRecord(value: unknown): value is CustomerRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractCustomers(payload: unknown): CustomerRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  for (const key of ['data', 'items', 'customers', 'results', 'result', 'organizations']) {
    const nested = payload[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
    if (isRecord(nested)) {
      const customers = extractCustomers(nested)
      if (customers.length > 0) return customers
    }
  }

  return [payload]
}

export async function getCustomers(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/header`, {
    params: {
      GslType: 6,
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
