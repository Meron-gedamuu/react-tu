import axios from 'axios'
import API_BASE_URL from './baseUrl'

export type ItemRecord = Record<string, unknown>
export type UnitOfMeasurementOption = {
  code: string
  description: string
}
export type ItemSearchParameters = {
  uomCode?: string
  ArticleCode?: string
  startTimStamp?: string
  endTimStamp?: string
}

function isRecord(value: unknown): value is ItemRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function extractItems(payload: unknown): ItemRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord)
  }

  if (!isRecord(payload)) {
    return []
  }

  for (const key of ['data', 'items', 'results', 'result', 'headers', 'articles']) {
    const nested = payload[key]
    if (Array.isArray(nested)) {
      return nested.filter(isRecord)
    }
    if (isRecord(nested)) {
      const nestedItems = extractItems(nested)
      if (nestedItems.length > 0) {
        return nestedItems
      }
    }
  }

  return []
}

export function getUnitOfMeasurementOptions(payload: unknown): UnitOfMeasurementOption[] {
  const options = extractItems(payload).flatMap((item) => {
    const code = item.code ?? item.Code
    const description = item.description ?? item.Description
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

export async function getItems(searchParameters?: ItemSearchParameters): Promise<unknown> {
  const params: Record<string, string | number> = {
    gslType: 1,
    branch: 'OUD100007979',
  }

  for (const [key, value] of Object.entries(searchParameters ?? {})) {
    const trimmedValue = value?.trim()
    if (trimmedValue) {
      params[key] = trimmedValue
    }
  }

  const response = await axios.get(`${API_BASE_URL}article/header`, {
    params,
  })

  return response.data
}

export async function getUnitOfMeasurementLookup(): Promise<unknown> {
  const response = await axios.get(`${API_BASE_URL}organization/lookup`, {
    params: {
      type: 'Unit of Measurement',
      component: 'CoMP000000003',
      isActive: 1,
    },
  })

  return response.data
}
