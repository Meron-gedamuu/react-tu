import axios from 'axios'
import API_BASE_URL from './baseUrl'

export type ServiceRecord = Record<string, unknown>

function isRecord(value: unknown): value is ServiceRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractServices(payload: unknown): ServiceRecord[] {
  if (Array.isArray(payload)) return payload.filter(isRecord)
  if (!isRecord(payload)) return []

  for (const key of ['data', 'items', 'services', 'results', 'result']) {
    const nested = payload[key]
    if (Array.isArray(nested)) return nested.filter(isRecord)
    if (isRecord(nested)) {
      const nestedServices = extractServices(nested)
      if (nestedServices.length > 0) return nestedServices
    }
  }

  return []
}

export async function getServices(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/header`, {
    params: {
      gslType: 7,
    },
  })

  return response.data
}