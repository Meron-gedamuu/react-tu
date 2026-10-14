import { useQuery } from '@tanstack/react-query'
import { Alert, Box, CircularProgress, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { extractServices, getServices } from '../api/services'

function displayValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value
  }
  return JSON.stringify(value)
}

function ServicesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['services'],
    queryFn: getServices,
  })

  const services = extractServices(data)
  const fields = [...new Set(services.flatMap((service) => Object.keys(service)))]
  const columns: GridColDef[] = fields.map((field) => ({
    field,
    headerName: field.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase()),
    minWidth: 150,
    flex: 1,
    valueGetter: (_value, row) => displayValue(row[field]),
  }))
  const rows = services.map((service, index) => ({
    ...service,
    id: service.id ?? service.ID ?? service.serviceId ?? service.serviceID ?? index,
  }))

  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 700 }}>
        Registered services
      </Typography>

      {isLoading ? (
        <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Unable to load services: {error.message}</Alert>
      ) : services.length === 0 ? (
        <Typography color="text.secondary">No services found.</Typography>
      ) : (
        <Box sx={{ height: 'min(72vh, 760px)', minHeight: 360, width: '100%' }}>
          <DataGrid
            aria-label="Registered services"
            rows={rows}
            columns={columns}
            pageSizeOptions={[10, 25, 50]}
            initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
            disableRowSelectionOnClick
          />
        </Box>
      )}
    </Box>
  )
}

export default ServicesPage