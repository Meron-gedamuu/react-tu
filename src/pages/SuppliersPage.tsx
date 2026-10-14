import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { Link, Outlet } from 'react-router-dom'
import { createSupplier, extractSuppliers, getSuppliers, type SupplierCreateData } from '../api/suppliers'

export type SupplierFormMutationContext = {
  mutate: (data: SupplierCreateData, onSuccess?: () => void) => void
  isPending: boolean
  error: Error | null
  isSuccess: boolean
  reset: () => void
}

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

function SupplierListPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
  })
  const suppliers = extractSuppliers(data)
  const fields = [...new Set(suppliers.flatMap((supplier) => Object.keys(supplier)))]
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
    
    id: supplier.id ?? supplier.OrganizationCode ?? supplier.organizationCode ?? index,

  }))

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Button component={Link} to="/" aria-label="Back to home" sx={{ mb: 2, ml: -1 }}>
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>←</span>
        <span style={{ marginLeft: 8 }}>Back</span>
      </Button>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 3 }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          Suppliers
        </Typography>
        <Button component={Link} to="/suppliers/new" variant="contained">
          New Supplier
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
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{
              pagination: { paginationModel: { pageSize: 25, page: 0 } },
              
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
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] })
    },
  })

  function mutateSupplier(data: SupplierCreateData, onSuccess?: () => void) {
    mutation.mutate(data, { onSuccess })
  }

  const context: SupplierFormMutationContext = {
    mutate: mutateSupplier,
    isPending: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  }

  return <Outlet context={context} />
}

export { SupplierListPage }
export default SuppliersPage