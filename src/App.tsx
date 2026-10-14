import { useState, type FormEvent } from 'react'
import { Autocomplete, IconButton, InputAdornment, TextField } from '@mui/material'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import type { Dayjs } from 'dayjs'
import { useQuery } from '@tanstack/react-query'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  extractItems,
  getItems,
  getUnitOfMeasurementLookup,
  getUnitOfMeasurementOptions,
  type ItemSearchParameters,
} from './api/items'
import ItemsPage, { ItemsGrid } from './pages/ItemsPage'
import NewSupplierPage from './pages/NewSupplierPage'
import SuppliersPage from './pages/SuppliersPage'

function App() {
  const location = useLocation()
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
      <Routes>
      <Route path="/" element={
        <main className="products-page">
          <header className="products-header">
            <div>
              <p className="eyebrow">CATALOG</p>
              <h1>Products</h1>
            </div>
            <div className="products-actions">
              <nav className="home-navigation" aria-label="Main navigation">
                <Link className="home-navigation-link" to="/items">Items</Link>
                <Link className="home-navigation-link" to="/suppliers">Suppliers</Link>
              </nav>
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

        </main>
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
      <Route path="/suppliers/new" element={<NewSupplierPage />} />
      <Route path="/suppliers" element={<SuppliersPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
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