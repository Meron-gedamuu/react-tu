import { useQuery } from '@tanstack/react-query'
import { Alert, Box, Button, CircularProgress, IconButton, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { Link, Outlet } from 'react-router-dom'
import { extractSuppliers, getSuppliers, type SupplierRecord } from '../api/suppliers'

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

function readText(record: SupplierRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).trim()
    }
  }

  return ''
}

function SupplierListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  })
  const suppliers = extractSuppliers(data)
  const mappedFields = [
    { field: 'TradeName', headerName: 'Trade Name', keys: ['tradeName', 'TradeName'] },
    { field: 'BrandName', headerName: 'Brand Name', keys: ['brandName', 'brandmes', 'BrandName'] },
    { field: 'Tax', headerName: 'Tax', keys: ['taxType'] },
    { field: 'Remark', headerName: 'Remark', keys: ['remark', 'Remark'] },
  ]
  const mappedSourceKeys = new Set(mappedFields.flatMap(({ keys }) => keys))
  const fields = [...new Set(
    suppliers.flatMap((supplier) =>
      Object.keys(supplier).filter((field) => !mappedSourceKeys.has(field)),
    ),
  )]
  const mappedColumns: GridColDef[] = mappedFields.map(({ field, headerName }) => ({
    field,
    headerName,
    minWidth: 160,
    flex: 1,
    sortable: true,
  }))
  const columns: GridColDef[] = fields.map((field) => {
    const values = suppliers.map((supplier) => supplier[field])
    return {
      field,
      headerName: field.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
      type: getColumnType(values),
      minWidth: 160,
      flex: 1,
      sortable: true,
      valueGetter: (_value, row) => displayValue(row[field]),
    }
  })
  const rows = suppliers.map((supplier, index) => ({
    ...supplier,
    TradeName: readText(supplier, ['tradeName', 'TradeName']) || null,
    BrandName: readText(supplier, ['brandName', 'brandmes', 'BrandName']) || null,
    Tax: readText(supplier, ['taxType']) || null,
    Remark: readText(supplier, ['remark', 'Remark']) || null,
    id: supplier.id ?? supplier.OrganizationCode ?? supplier.organizationCode ?? index,
  }))
  mappedColumns.unshift({
    field: 'edit',
    headerName: 'Actions',
    sortable: false,
    filterable: false,
    minWidth: 110,
    renderCell: ({ row }) => {
      const code = row.OrganizationCode
      if (typeof code !== 'string' && typeof code !== 'number') return null

      return (
        <IconButton
          component={Link}
          to={`/suppliers/edit/${encodeURIComponent(String(code))}`}
          size="small"
          aria-label={`Edit supplier ${String(code)}`}
          title="Edit supplier"
        >
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
          </svg>
        </IconButton>
      )
    },
  })
  mappedColumns.push(...columns)

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Button component={Link} to="/" aria-label="Back to home" sx={{ mb: 2, ml: -1 }}>
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>←</span>
        <span style={{ marginLeft: 8 }}>Back</span>
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
            Suppliers
          </Typography>
          <Typography color="text.secondary">{suppliers.length} records</Typography>
        </Box>
        <Button
          component={Link}
          to="/suppliers/new"
          variant="contained"
        >
          Create Supplier
        </Button>
      </Box>

      {isLoading ? (
        <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Unable to load suppliers: {error.message}</Alert>
      ) : suppliers.length === 0 ? (
        <Typography color="text.secondary">No supplier records found.</Typography>
      ) : (
        <Box sx={{ height: 'min(72vh, 760px)', minHeight: 360, width: '100%' }}>
          <DataGrid
            aria-label="Suppliers"
            rows={rows}
            columns={mappedColumns}
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

function SuppliersPage() {
  return <Outlet />
}

export { SupplierListPage }
export default SuppliersPage