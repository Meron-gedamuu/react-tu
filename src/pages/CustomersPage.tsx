import { useQuery } from '@tanstack/react-query'
import { Alert, Box, CircularProgress, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { extractCustomers, getCustomers, type CustomerRecord } from '../api/customers'

function getColumnType(values: unknown[]): GridColDef['type'] {
  const definedValues = values.filter((value) => value !== null && value !== undefined)

  if (definedValues.length > 0 && definedValues.every((value) => typeof value === 'boolean')) {
    return 'boolean'
  }
  if (definedValues.length > 0 && definedValues.every((value) => typeof value === 'number')) {
    return 'number'
  }

  return 'string'
}

function displayValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return JSON.stringify(value)
}

function readText(record: CustomerRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).trim()
    }
  }

  return ''
}

function CustomersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers,
  })
  const customers = extractCustomers(data)
  const mappedFields = [
    { field: 'OrganizationCode', headerName: 'Customer Code' },
    { field: 'tradeName', headerName: 'Trade Name' },
    { field: 'brandName', headerName: 'Brand Name' },
    { field: 'businessTypeName', headerName: 'Business Type' },
    { field: 'taxTypeDesc', headerName: 'Tax Type' },
    { field: 'objectStateDefnDesc', headerName: 'Status' },
    { field: 'TIN', headerName: 'TIN' },
    { field: 'remark', headerName: 'Remark' },
  ]
  const mappedSourceFields = new Set(mappedFields.map(({ field }) => field))
  const fields = [...new Set(
    customers.flatMap((customer) =>
      Object.keys(customer).filter((field) => !mappedSourceFields.has(field)),
    ),
  )]
  const mappedColumns: GridColDef[] = mappedFields.map(({ field, headerName }) => ({
    field,
    headerName,
    minWidth: 160,
    flex: 1,
    sortable: true,
    valueGetter: (_value, row) => displayValue(row[field]),
  }))
  const columns: GridColDef[] = fields.map((field) => ({
    field,
    headerName: field.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    type: getColumnType(customers.map((customer) => customer[field])),
    minWidth: 160,
    flex: 1,
    sortable: true,
    valueGetter: (_value, row) => displayValue(row[field]),
  }))
  const rows = customers.map((customer, index) => ({
    ...customer,
    OrganizationCode: readText(customer, ['OrganizationCode', 'organizationCode', 'Code', 'code']) || null,
    tradeName: readText(customer, ['tradeName', 'TradeName']) || null,
    brandName: readText(customer, ['brandName', 'BrandName']) || null,
    businessTypeName: readText(customer, ['businessTypeName', 'BusinessTypeName']) || null,
    taxTypeDesc: readText(customer, ['taxTypeDesc', 'TaxTypeDesc']) || null,
    objectStateDefnDesc: readText(customer, ['objectStateDefnDesc', 'ObjectStateDefnDesc']) || null,
    TIN: readText(customer, ['TIN', 'tin']) || null,
    remark: readText(customer, ['remark', 'Remark']) || null,
    id: customer.id ?? customer.ID ?? customer.OrganizationCode ?? customer.organizationCode ?? index,
  }))

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 3 }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          Customers
        </Typography>
        <Typography color="text.secondary">{customers.length} records</Typography>
      </Box>

      {isLoading ? (
        <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Unable to load customers: {error.message}</Alert>
      ) : customers.length === 0 ? (
        <Typography color="text.secondary">No customer records found.</Typography>
      ) : (
        <Box sx={{ height: 'min(72vh, 760px)', minHeight: 360, width: '100%' }}>
          <DataGrid
            aria-label="Customers"
            rows={rows}
            columns={[...mappedColumns, ...columns]}
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 100, page: 0 } },
              sorting: { sortModel: [{ field: 'OrganizationCode', sort: 'asc' }] },
            }}
            disableRowSelectionOnClick
          />
        </Box>
      )}
    </Box>
  )
}

export default CustomersPage
