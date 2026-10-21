import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { extractCustomers, getCustomers, type CustomerRecord } from '../api/customers'
import {
  extractEmployees,
  getEmployeeBranchCode,
  getEmployees,
  type EmployeeRecord,
} from '../api/employees'
import { extractItems, getItems, type ItemRecord } from '../api/items'
import { extractSuppliers, getSuppliers, type SupplierRecord } from '../api/suppliers'

type SearchModule = 'Items' | 'Customers' | 'Suppliers' | 'Employees'
type SearchResult = {
  id: string
  module: SearchModule
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

function containsQuery(value: unknown, query: string, visited = new Set<object>()): boolean {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).toLocaleLowerCase().includes(query)
  }
  if (value === null || typeof value !== 'object' || visited.has(value)) return false

  visited.add(value)
  if (Array.isArray(value)) {
    return value.some((entry) => containsQuery(entry, query, visited))
  }

  return Object.values(value).some((entry) => containsQuery(entry, query, visited))
}

function toSearchResults<T extends Record<string, unknown>>(
  records: T[],
  query: string,
  module: SearchModule,
  to: string,
  labelKeys: string[],
  detailKeys: string[],
  idKeys: string[],
  fallbackLabel: (record: T) => string = () => '',
): SearchResult[] {
  return records.flatMap((record, index) => {
    if (!containsQuery(record, query)) return []

    const label = firstText(record, labelKeys) || fallbackLabel(record) || `${module} ${index + 1}`
    const detail = firstText(record, detailKeys)
    const id = firstText(record, idKeys) || `${module}-${index}`

    return [{ id, module, label, detail, to }]
  })
}

function employeeName(employee: EmployeeRecord): string {
  return [
    employee.firstName,
    employee.middleName,
    employee.lastName,
  ].flatMap((value) => (
    typeof value === 'string' && value.trim() ? [value.trim()] : []
  )).join(' ')
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
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
  })
  const suppliersQuery = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
  })
  const employeesQuery = useQuery({
    queryKey: ['employees', getEmployeeBranchCode()],
    queryFn: () => getEmployees(),
    enabled: isSearchEnabled,
    staleTime: 5 * 60 * 1000,
  })

  const results = useMemo(() => {
    if (!query) return []

    const items = toSearchResults<ItemRecord>(
      extractItems(itemsQuery.data),
      query,
      'Items',
      '/items',
      ['ArticleName', 'articleName', 'Name', 'name', 'Description', 'description'],
      ['ArticleCode', 'articleCode', 'Code', 'code'],
      ['id', 'ID', 'articleId', 'articleID', 'ArticleCode'],
    )
    const customers = toSearchResults<CustomerRecord>(
      extractCustomers(customersQuery.data),
      query,
      'Customers',
      '/customers',
      ['tradeName', 'TradeName', 'brandName', 'BrandName', 'name', 'Name'],
      ['OrganizationCode', 'organizationCode', 'Code', 'code'],
      ['id', 'ID', 'OrganizationCode', 'organizationCode'],
    )
    const suppliers = toSearchResults<SupplierRecord>(
      extractSuppliers(suppliersQuery.data),
      query,
      'Suppliers',
      '/suppliers',
      ['TradeName', 'tradeName', 'OrganizationName', 'organizationName', 'Name', 'name'],
      ['OrganizationCode', 'organizationCode', 'Code', 'code'],
      ['id', 'ID', 'organizationId', 'organizationID', 'OrganizationCode'],
    )
    const employees = toSearchResults<EmployeeRecord>(
      extractEmployees(employeesQuery.data),
      query,
      'Employees',
      '/employees',
      [],
      ['personcode', 'department', 'genderdesc'],
      ['personcode', 'usercode', 'userName'],
      employeeName,
    )

    return [...items, ...customers, ...suppliers, ...employees]
  }, [
    customersQuery.data,
    employeesQuery.data,
    itemsQuery.data,
    query,
    suppliersQuery.data,
  ])

  const isDebouncing = value.trim().toLocaleLowerCase() !== query
  const queries = [
    { name: 'items', query: itemsQuery },
    { name: 'customers', query: customersQuery },
    { name: 'suppliers', query: suppliersQuery },
    { name: 'employees', query: employeesQuery },
  ]
  const isLoading = Boolean(value.trim()) && (
    isDebouncing || queries.some(({ query: moduleQuery }) => moduleQuery.isLoading)
  )
  const errors = queries
    .filter(({ query: moduleQuery }) => moduleQuery.error)
    .map(({ name }) => name)
  const groupedResults = (['Items', 'Customers', 'Suppliers', 'Employees'] as const)
    .map((module) => ({
      module,
      results: results.filter((result) => result.module === module),
    }))
    .filter((group) => group.results.length > 0)
  const showResults = isFocused && Boolean(value.trim())

  return (
    <div
      className="global-search"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsFocused(false)
      }}
    >
      <label className="visually-hidden" htmlFor="global-search-input">
        Search all records
      </label>
      <div className="global-search-control">
        <span className="global-search-icon" aria-hidden="true">⌕</span>
        <input
          id="global-search-input"
          type="search"
          value={value}
          placeholder="Search all records..."
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
          {isLoading && <p className="global-search-message" role="status">Searching all modules...</p>}
          {!isLoading && groupedResults.map(({ module, results: moduleResults }) => (
            <section
              className="global-search-group"
              key={module}
              aria-label={`${module} results`}
            >
              <h2 className="global-search-group-heading">
                {module}<span>{moduleResults.length}</span>
              </h2>
              {moduleResults.map((result, index) => (
                <Link
                  key={`${result.id}-${index}`}
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
                  <span className="global-search-category">{module}</span>
                </Link>
              ))}
            </section>
          ))}
          {!isLoading && results.length === 0 && errors.length === 0 && (
            <p className="global-search-message">No results found</p>
          )}
          {!isLoading && errors.map((module) => (
            <p className="global-search-error" key={module} role="alert">
              Unable to search {module}.
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
