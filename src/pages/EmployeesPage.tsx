import { useQuery } from '@tanstack/react-query'
import { Alert, Box, CircularProgress, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import {
  extractEmployees,
  getEmployeeBranchCode,
  getEmployees,
  type EmployeeRecord,
} from '../api/employees'

function isRecord(value: unknown): value is EmployeeRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textValue(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim()
    return text || null
  }
  return null
}

function listValue(
  value: unknown,
  field: string,
): string | null {
  if (!Array.isArray(value)) return null

  const values = value.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const text = textValue(entry[field])
    return text ? [text] : []
  })
  return values.length > 0 ? values.join(', ') : null
}

function departmentValue(value: unknown): string | null {
  const directValue = textValue(value)
  if (directValue) return directValue
  if (isRecord(value)) {
    return textValue(value.description)
  }
  return null
}

function bioIdValue(value: unknown): string | null {
  if (!Array.isArray(value)) return null

  for (const entry of value) {
    if (!isRecord(entry)) continue
    const identification = entry
    if (
      typeof identification.typeDescription === 'string'
      && identification.typeDescription.toLowerCase().includes('bio')
    ) {
      return textValue(identification.idNumber)
    }
  }

  return null
}

function EmployeesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', getEmployeeBranchCode()],
    queryFn: () => getEmployees(),
  })
  const employees = extractEmployees(data)
  const columns: GridColDef[] = [
    { field: 'firstName', headerName: 'First Name', minWidth: 160, flex: 1 },
    { field: 'middleName', headerName: 'Middle Name', minWidth: 160, flex: 1 },
    {
      field: 'isActive',
      headerName: 'Is Active',
      minWidth: 120,
      type: 'boolean',
    },
    { field: 'department', headerName: 'Department', minWidth: 180, flex: 1 },
    { field: 'branch', headerName: 'Branch', minWidth: 160, flex: 1 },
    { field: 'state', headerName: 'State', minWidth: 150, flex: 1 },
    { field: 'bioId', headerName: 'Bio ID', minWidth: 150, flex: 1 },
  ]
  const rows = employees.map((employee, index) => ({
    id: textValue(employee.personcode) ?? index,
    firstName: textValue(employee.firstName),
    middleName: textValue(employee.middleName),
    isActive: employee.isActive === true,
    department: departmentValue(employee.department),
    branch: listValue(employee.organizationunitdefinition, 'branchdesc'),
    state: listValue(employee.objectStateDefinition, 'description'),
    bioId: bioIdValue(employee.identification),
  }))

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 3 }}>
        <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
          Employees
        </Typography>
        <Typography color="text.secondary">{employees.length} records</Typography>
      </Box>

      {isLoading ? (
        <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Unable to load employees: {error.message}</Alert>
      ) : employees.length === 0 ? (
        <Typography color="text.secondary">No employee records found.</Typography>
      ) : (
        <Box sx={{ height: 'min(72vh, 760px)', minHeight: 360, width: '100%' }}>
          <DataGrid
            aria-label="Employees"
            rows={rows}
            columns={columns}
            pageSizeOptions={[25, 50, 100]}
            initialState={{
              pagination: { paginationModel: { pageSize: 100, page: 0 } },
              sorting: { sortModel: [{ field: 'firstName', sort: 'asc' }] },
            }}
            disableRowSelectionOnClick
          />
        </Box>
      )}
    </Box>
  )
}

export default EmployeesPage
