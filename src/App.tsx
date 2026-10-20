import { useState, type FormEvent } from 'react'
import { Autocomplete, IconButton, InputAdornment, TextField } from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import type { Dayjs } from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  extractItems,
  getItems,
  getUnitOfMeasurementLookup,
  getUnitOfMeasurementOptions,
  type ItemSearchParameters,
} from './api/items'
import ItemsPage, { ItemsGrid } from './pages/ItemsPage'
import SupplierFormPage from './pages/SupplierFormPage'
import ProformaPage from './pages/ProformaPage'
import SuppliersPage, { SupplierListPage } from './pages/SuppliersPage'
import GlobalSearch from './components/GlobalSearch'
import { createSupplier, updateSupplier } from './api/suppliers'

const navigationItems = [
  { label: 'Items', to: '/items', icon: 'items' },
  { label: 'Suppliers', to: '/suppliers', icon: 'suppliers' },
  { label: 'Proforma', to: '/proforma', icon: 'proforma' },
] as const

function NavigationIcon({ name }: { name: (typeof navigationItems)[number]['icon'] }) {
  const commonProps = {
    'aria-hidden': true as const,
    fill: 'none',
    height: 20,
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
    width: 20,
  }

  if (name === 'items') {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5h16M4 12h16M4 18.5h16" />
        <circle cx="7" cy="5.5" r="1" />
        <circle cx="7" cy="12" r="1" />
        <circle cx="7" cy="18.5" r="1" />
      </svg>
    )
  }
  if (name === 'suppliers') {
    return (
      <svg {...commonProps}>
        <circle cx="9" cy="8" r="3.25" />
        <path d="M3.5 19v-1.3A4.7 4.7 0 0 1 8.2 13h1.6a4.7 4.7 0 0 1 4.7 4.7V19z" />
        <path d="M16 4.9a3.25 3.25 0 0 1 0 6.2M17 13.2a4.7 4.7 0 0 1 3.5 4.5V19h-3" />
      </svg>
    )
  }
  return (
    <svg {...commonProps}>
      <path d="M6 3.5h8l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M14 3.5v5h5M8 13h8M8 17h8" />
    </svg>
  )
}

function App() {
  const location = useLocation()
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(
    () => !window.matchMedia('(max-width: 760px)').matches,
  )
  const [appliedFilters, setAppliedFilters] = useState<ItemSearchParameters>({})
  const [searchRevision, setSearchRevision] = useState(0)
  const {
    data: itemPayload,
    isLoading: isLoadingItems,
    isFetching: isFetchingItems,
    error: itemsError,
  } = useQuery({
    queryKey: ['items', appliedFilters, searchRevision],
    queryFn: () => getItems(appliedFilters),
  })
  const { data: uomPayload, isLoading: isLoadingUoms, error: uomError } = useQuery({
    queryKey: ['unit-of-measurement'],
    queryFn: getUnitOfMeasurementLookup,
  })
  const [searchOpen, setSearchOpen] = useState(location.pathname === '/')
  const [code, setCode] = useState('')
  const [uom, setUom] = useState('')
  const [fromDate, setFromDate] = useState<Dayjs | null>(null)
  const [toDate, setToDate] = useState<Dayjs | null>(null)
  const uomOptions = getUnitOfMeasurementOptions(uomPayload)
  const items = extractItems(itemPayload)

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAppliedFilters({
      uomCode: uom || undefined,
      ArticleCode: code.trim() || undefined,
      startTimStamp: fromDate?.format('YYYY-MM-DD'),
      endTimStamp: toDate?.format('YYYY-MM-DD'),
    })
    setSearchRevision((revision) => revision + 1)
    setSearchOpen(false)
  }

  function closeSearch() {
    setSearchOpen(false)
  }

  return (
    <>
      <div className={`app-shell${isSidebarExpanded ? ' sidebar-expanded' : ' sidebar-collapsed'}`}>
        <aside className="app-sidebar" aria-label="Main navigation">
          <div className="sidebar-top">
            <Link className="app-brand" to="/" aria-label="Catalog home">C</Link>
            <button
              className="sidebar-toggle"
              type="button"
              aria-label={isSidebarExpanded ? 'Collapse navigation' : 'Expand navigation'}
              aria-expanded={isSidebarExpanded}
              onClick={() => setIsSidebarExpanded((expanded) => !expanded)}
            >
              <span aria-hidden="true">☰</span>
            </button>
          </div>
          <nav className="sidebar-navigation">
            {navigationItems.map((item) => (
              <NavLink
                key={item.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                to={item.to}
                title={!isSidebarExpanded ? item.label : undefined}
                onClick={() => {
                  if (window.matchMedia('(max-width: 760px)').matches) {
                    setIsSidebarExpanded(false)
                  }
                }}
              >
                <NavigationIcon name={item.icon} />
                <span className="sidebar-link-label">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>
        {isSidebarExpanded && (
          <button
            className="sidebar-backdrop"
            type="button"
            aria-label="Close navigation"
            onClick={() => setIsSidebarExpanded(false)}
          />
        )}
        <main className="app-main">
          <header className="app-header">
            <div className="app-header-inner">
              <GlobalSearch />
            </div>
          </header>
          <Routes>
            <Route path="/" element={
              <div className="products-page">
                <header className="products-header">
                  <div>
                    <p className="eyebrow">CATALOG</p>
                    <h1>Products</h1>
                  </div>
                </header>

                <section className="product-results" aria-live="polite">
                  <div className="results-heading">
                    <h2>Product catalog</h2>
                    <span>{items.length} results</span>
                  </div>
                  <ItemsGrid
                    items={items}
                    isLoading={isLoadingItems}
                    isFetching={isFetchingItems}
                    error={itemsError}
                    ariaLabel="Product catalog"
                  />
                </section>
              </div>
            } />
            <Route
              path="/items"
              element={(
                <ItemsPage
                  items={items}
                  isLoading={isLoadingItems}
                  isFetching={isFetchingItems}
                  error={itemsError}
                  onOpenProductsSearch={() => setSearchOpen(true)}
                />
              )}
            />
            <Route path="/proforma" element={<ProformaPage />} />
            <Route path="/suppliers" element={<SuppliersPage />}>
              <Route index element={<SupplierListPage />} />
              <Route path="new" element={<SupplierFormPage createSupplier={createSupplier} />} />
              <Route path="edit/:code" element={<SupplierFormPage updateSupplier={updateSupplier} />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {searchOpen && (
        <div className="search-modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeSearch()
        }}>
          <section className="search-modal" role="dialog" aria-modal="true" aria-labelledby="search-title">
            <header className="search-modal-header">
              <div>
                <p className="eyebrow">CATALOG FILTERS</p>
                <h2 id="search-title">Search products</h2>
              </div>
              <button className="close-search-button" type="button" onClick={closeSearch} aria-label="Close search">
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <form onSubmit={handleSearch}>
              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <div className="search-fields">
                  <div className="search-field">
                    <div className="date-picker-clear">
                      <DatePicker
                        label="From date"
                        value={fromDate}
                        onChange={setFromDate}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                      <IconButton
                        aria-label="Clear from date"
                        size="small"
                        disabled={!fromDate}
                        onClick={() => setFromDate(null)}
                      >
                        <span aria-hidden="true">×</span>
                      </IconButton>
                    </div>
                  </div>
                  <div className="search-field">
                    <div className="date-picker-clear">
                      <DatePicker
                        label="To date"
                        value={toDate}
                        onChange={setToDate}
                        minDate={fromDate ?? undefined}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                      <IconButton
                        aria-label="Clear to date"
                        size="small"
                        disabled={!toDate}
                        onClick={() => setToDate(null)}
                      >
                        <span aria-hidden="true">×</span>
                      </IconButton>
                    </div>
                  </div>
                  <div className="search-field">
                    <TextField
                      id="product-code"
                      label="Code"
                      size="small"
                      fullWidth
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      placeholder="Enter code"
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              aria-label="Clear code"
                              size="small"
                              disabled={!code}
                              onClick={() => setCode('')}
                              edge="end"
                            >
                              <span aria-hidden="true">×</span>
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </div>
                  <div className="search-field">
                    <Autocomplete
                      options={uomOptions}
                      value={uomOptions.find((option) => option.code === uom) ?? null}
                      getOptionLabel={(option) => option.description}
                      isOptionEqualToValue={(option, value) => option.code === value.code}
                      onChange={(_, value) => setUom(value?.code ?? '')}
                      loading={isLoadingUoms}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="UOM"
                          size="small"
                          error={Boolean(uomError)}
                          helperText={uomError ? 'Unable to load UOM options' : undefined}
                        />
                      )}
                    />
                  </div>
                </div>
              </LocalizationProvider>

              <footer className="search-modal-footer">
                <button className="cancel-search-button" type="button" onClick={closeSearch}>Cancel</button>
                <button className="submit-search-button" type="submit">Search</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </>
  )
}

export default App