import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { extractItems, getItems, type ItemRecord } from '../api/items'
import { extractSuppliers, getSuppliers, type SupplierRecord } from '../api/suppliers'

type SearchResult = {
  id: string
  category: 'Item' | 'Supplier'
  label: string
  detail: string
  to: string
}

function firstText(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' || typeof value === 'number') {
      const text = String(value).trim()
      if (text) return text
    }
  }

  return ''
}

function matchesSearch(record: Record<string, unknown>, query: string): boolean {
  return Object.values(record).some((value) => {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value).toLocaleLowerCase().includes(query)
    }
    if (value !== null && value !== undefined) {
      return (JSON.stringify(value) ?? '').toLocaleLowerCase().includes(query)
    }
    return false
  })
}

function toSearchResults<T extends Record<string, unknown>>(
  records: T[],
  query: string,
  category: SearchResult['category'],
  to: string,
  labelKeys: string[],
  detailKeys: string[],
  idKeys: string[],
): SearchResult[] {
  return records.flatMap((record, index) => {
    if (!matchesSearch(record, query)) return []

    const label = firstText(record, labelKeys) || `${category} ${index + 1}`
    const detail = firstText(record, detailKeys)
    const id = firstText(record, idKeys) || `${category}-${index}`

    return [{ id, category, label, detail, to }]
  })
}

function GlobalSearch() {
  const [value, setValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [debouncedValue, setDebouncedValue] = useState('')
  const query = debouncedValue.trim().toLocaleLowerCase()
  const isSearchEnabled = query.length > 0

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), 250)
    return () => window.clearTimeout(timeout)
  }, [value])

  const itemsQuery = useQuery({
    queryKey: ['global-search-items'],
    queryFn: () => getItems(),
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
  })
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
  })

  const results = useMemo(() => {
    if (!query) return []

    const items = toSearchResults<ItemRecord>(
      extractItems(itemsQuery.data),
      query,
      'Item',
      '/items',
      ['ArticleName', 'articleName', 'Name', 'name', 'Description', 'description'],
      ['ArticleCode', 'articleCode', 'Code', 'code'],
      ['id', 'ID', 'articleId', 'articleID', 'ArticleCode'],
    )
    const suppliers = toSearchResults<SupplierRecord>(
      extractSuppliers(suppliersQuery.data),
      query,
      'Supplier',
      '/suppliers',
      ['TradeName', 'tradeName', 'OrganizationName', 'organizationName', 'Name', 'name'],
      ['OrganizationCode', 'organizationCode', 'Code', 'code'],
      ['id', 'ID', 'organizationId', 'organizationID', 'OrganizationCode'],
    )

    return [...items, ...suppliers]
  }, [itemsQuery.data, query, suppliersQuery.data])

  const isDebouncing = value.trim().toLocaleLowerCase() !== query
  const isLoading = Boolean(value.trim()) && (
    isDebouncing ||
    itemsQuery.isLoading ||
    suppliersQuery.isLoading
  )
  const errors = [
    itemsQuery.error && 'items',
    suppliersQuery.error && 'suppliers',
  ].filter((category): category is string => Boolean(category))
  const showResults = isFocused && Boolean(value.trim())

  return (
    <div
      className="global-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false)
      }}
    >
      <label className="visually-hidden" htmlFor="global-search-input">
        Search items and suppliers
      </label>
      <div className="global-search-control">
        <span className="global-search-icon" aria-hidden="true">⌕</span>
        <input
          id="global-search-input"
          type="search"
          value={value}
          placeholder="Search items and suppliers..."
          autoComplete="off"
          aria-controls="global-search-results"
          aria-expanded={showResults}
          onFocus={() => setIsFocused(true)}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setIsFocused(false)
          }}
        />
        {value && (
          <button
            className="global-search-clear"
            type="button"
            aria-label="Clear search"
            onClick={() => {
              setValue('')
              setDebouncedValue('')
              setIsFocused(true)
            }}
          >
            ×
          </button>
        )}
      </div>
      {showResults && (
        <div className="global-search-results" id="global-search-results" role="region" aria-label="Search results">
          {isLoading && <p className="global-search-message" role="status">Searching...</p>}
          {!isLoading && results.map((result, index) => (
            <Link
              key={`${result.category}-${result.id}-${index}`}
              className="global-search-result"
              to={result.to}
              onClick={() => {
                setValue('')
                setDebouncedValue('')
                setIsFocused(false)
              }}
            >
              <span className="global-search-result-copy">
                <span className="global-search-result-title">{result.label}</span>
                {result.detail && <span className="global-search-result-detail">{result.detail}</span>}
              </span>
              <span className="global-search-category">{result.category}</span>
            </Link>
          ))}
          {!isLoading && results.length === 0 && errors.length === 0 && (
            <p className="global-search-message">No results found</p>
          )}
          {!isLoading && errors.map((category) => (
            <p className="global-search-error" key={category} role="alert">
              Unable to search {category}.
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
