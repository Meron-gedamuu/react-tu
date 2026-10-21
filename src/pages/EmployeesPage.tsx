import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  IconButton,
  InputLabel,
  MenuItem,
  Menu,
  Select,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  DataGrid,
  type GridColDef,
  type GridRowSelectionModel,
} from '@mui/x-data-grid'
import Edit from '@mui/icons-material/esm/Edit.js'
import Add from '@mui/icons-material/esm/Add.js'
import Fingerprint from '@mui/icons-material/esm/Fingerprint.js'
import HighlightOff from '@mui/icons-material/esm/HighlightOff.js'
import GridView from '@mui/icons-material/esm/GridView.js'
import LockReset from '@mui/icons-material/esm/LockReset.js'
import MoreVert from '@mui/icons-material/esm/MoreVert.js'
import Person from '@mui/icons-material/esm/Person.js'
import ViewModule from '@mui/icons-material/esm/ViewModule.js'
import VpnKey from '@mui/icons-material/esm/VpnKey.js'
import Visibility from '@mui/icons-material/esm/Visibility.js'
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import type { Dayjs } from 'dayjs'
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

type SaveToMachineErrors = Partial<
  Record<'machine' | 'name' | 'id' | 'startDate' | 'endDate', string>
>

type EmployeeView = 'grid' | 'cards'

function EmployeesPage() {
  const [view, setView] = useState<EmployeeView>('grid')
  const [newEmployeeNotice, setNewEmployeeNotice] = useState(false)
  const [search, setSearch] = useState('')
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([])
  const [cardMenuAnchor, setCardMenuAnchor] = useState<HTMLElement | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null)
  const [machine, setMachine] = useState('')
  const [name, setName] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [formErrors, setFormErrors] = useState<SaveToMachineErrors>({})
  const [saveError, setSaveError] = useState('')
  const { data, isLoading, error } = useQuery({
    queryKey: ['employees', getEmployeeBranchCode()],
    queryFn: () => getEmployees(),
  })
  const employees = extractEmployees(data)

  function closeSaveToMachine() {
    setSelectedEmployee(null)
    setMachine('')
    setName('')
    setEmployeeId('')
    setStartDate(null)
    setEndDate(null)
    setFormErrors({})
    setSaveError('')
  }

  function openSaveToMachine(employee: EmployeeRecord) {
    const employeeName = [
      employee.firstName,
      employee.middleName,
      employee.lastName,
    ].flatMap((part) => {
      const text = textValue(part)
      return text ? [text] : []
    }).join(' ')

    setSelectedEmployee(employee)
    setMachine('')
    setName(employeeName)
    setEmployeeId(textValue(employee.personcode) ?? '')
    setStartDate(null)
    setEndDate(null)
    setFormErrors({})
    setSaveError('')
  }

  function validateSaveToMachine(): boolean {
    const errors: SaveToMachineErrors = {}
    if (!machine) errors.machine = 'Select a machine.'
    if (!name.trim()) errors.name = 'Name is required.'
    if (!employeeId.trim()) errors.id = 'ID is required.'
    if (!startDate) errors.startDate = 'Start date is required.'
    if (!endDate) errors.endDate = 'End date is required.'
    if (startDate && endDate && endDate.isBefore(startDate, 'day')) {
      errors.endDate = 'End date must be on or after the start date.'
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function saveToMachine() {
    setSaveError('')
    if (!validateSaveToMachine()) return

    setSaveError(
      'Saving fingerprints is unavailable because no machine lookup or save API is configured.',
    )
  }

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
    {
      field: 'actions',
      headerName: 'Actions',
      width: 144,
      minWidth: 144,
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      align: 'center',
      headerAlign: 'center',
      renderCell: ({ row }) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
          <IconButton
            size="small"
            aria-label={`Fingerprint ${row.firstName ?? ''} ${row.middleName ?? ''}`.trim()}
            title="Fingerprint"
            onClick={() => {
              if (isRecord(row.employee)) openSaveToMachine(row.employee)
            }}
          >
            <Fingerprint fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`Edit ${row.firstName ?? ''} ${row.middleName ?? ''}`.trim()}
            title="Edit"
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            aria-label={`Key ${row.firstName ?? ''} ${row.middleName ?? ''}`.trim()}
            title="Lock/Key"
          >
            <VpnKey fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
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
    employee,
  }))
  const normalizedSearch = search.trim().toLowerCase()
  const filteredRows = normalizedSearch
    ? rows.filter((row) => [
      row.firstName,
      row.middleName,
      row.employee.lastName,
      row.id,
      row.department,
      row.branch,
      row.state,
      row.bioId,
    ].some((value) => String(value ?? '').toLowerCase().includes(normalizedSearch)))
    : rows
  const filteredIds = filteredRows.map((row) => row.id)
  const allFilteredSelected = filteredIds.length > 0
    && filteredIds.every((id) => selectionModel.includes(id))
  const someFilteredSelected = filteredIds.some((id) => selectionModel.includes(id))

  function toggleEmployeeSelection(id: string | number) {
    setSelectionModel((current) => (
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    ))
  }

  function toggleFilteredSelection() {
    setSelectionModel((current) => {
      if (allFilteredSelected) {
        return current.filter((id) => !filteredIds.includes(id))
      }
      return [...new Set([...current, ...filteredIds])]
    })
  }

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5 }}>
          <Typography component="h1" variant="h4" sx={{ fontWeight: 700 }}>
            Employees
          </Typography>
          <Typography color="text.secondary">{employees.length} records</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setNewEmployeeNotice(true)}
          >
            New
          </Button>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={view}
            onChange={(_event, nextView: EmployeeView | null) => {
              if (nextView) setView(nextView)
            }}
            aria-label="Employee view"
          >
            <Tooltip title="Grid View">
              <ToggleButton value="grid" aria-label="Grid View">
                <GridView />
              </ToggleButton>
            </Tooltip>
            <Tooltip title="Card View">
              <ToggleButton value="cards" aria-label="Card View">
                <ViewModule />
              </ToggleButton>
            </Tooltip>
          </ToggleButtonGroup>
        </Box>
      </Box>
      {newEmployeeNotice && (
        <Alert
          severity="info"
          onClose={() => setNewEmployeeNotice(false)}
          sx={{ mb: 2 }}
        >
          Employee registration is not available yet; this application has no employee
          registration route or form configured.
        </Alert>
      )}

      {isLoading ? (
        <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">Unable to load employees: {error.message}</Alert>
      ) : employees.length === 0 ? (
        <Typography color="text.secondary">No employee records found.</Typography>
      ) : (
        <Box>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 2,
              flexWrap: 'wrap',
            }}
          >
            {view === 'cards' && (
              <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 135 }}>
                <Checkbox
                  checked={allFilteredSelected}
                  indeterminate={!allFilteredSelected && someFilteredSelected}
                  onChange={toggleFilteredSelection}
                  inputProps={{ 'aria-label': 'Select all filtered employees' }}
                />
                <Typography variant="body2">Select all</Typography>
              </Box>
            )}
            <TextField
              size="small"
              label="Search employees"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ width: { xs: '100%', sm: 320 } }}
            />
            {selectionModel.length > 0 && (
              <Typography variant="body2" color="text.secondary">
                {selectionModel.length} selected
              </Typography>
            )}
          </Box>
          {filteredRows.length === 0 ? (
            <Typography color="text.secondary">No employees match your search.</Typography>
          ) : view === 'grid' ? (
            <Box sx={{ height: 'min(72vh, 760px)', minHeight: 360, width: '100%' }}>
              <DataGrid
                aria-label="Employees"
                rows={filteredRows}
                columns={columns}
                checkboxSelection
                rowSelectionModel={selectionModel}
                onRowSelectionModelChange={setSelectionModel}
                keepNonExistentRowsSelected
                pageSizeOptions={[
                  25,
                  50,
                  100,
                  { value: filteredRows.length, label: `All (${filteredRows.length})` },
                ]}
                initialState={{
                  pagination: { paginationModel: { pageSize: 100, page: 0 } },
                  sorting: { sortModel: [{ field: 'firstName', sort: 'asc' }] },
                }}
                disableRowSelectionOnClick
              />
            </Box>
          ) : (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 290px), 1fr))',
                gap: 2,
              }}
            >
              {filteredRows.map((row) => {
                const name = [row.firstName, row.middleName, row.employee.lastName]
                  .map((value) => textValue(value))
                  .filter((value): value is string => Boolean(value))
                  .join(' ')
                return (
                  <Card
                    key={row.id}
                    variant="outlined"
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      minWidth: 0,
                      borderLeft: '4px solid',
                      borderLeftColor: row.isActive ? 'success.main' : 'divider',
                      borderRadius: 0,
                      boxShadow: 1,
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1 }}>
                        <Checkbox
                          size="small"
                          checked={selectionModel.includes(row.id)}
                          onChange={() => toggleEmployeeSelection(row.id)}
                          inputProps={{ 'aria-label': `Select ${name || 'employee'}` }}
                        />
                        <Person sx={{ color: 'text.secondary', flexShrink: 0 }} />
                        <Typography
                          variant="subtitle2"
                          fontWeight={700}
                          noWrap
                          sx={{ minWidth: 0, flexGrow: 1 }}
                        >
                          {row.id}
                        </Typography>
                        <Box
                          component="span"
                          sx={{
                            px: 1,
                            py: 0.5,
                            border: '1px solid',
                            borderColor: 'success.light',
                            bgcolor: 'success.light',
                            color: 'success.dark',
                            fontSize: '0.8125rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {row.isActive ? 'Active' : 'Inactive'}
                        </Box>
                        <IconButton
                          size="small"
                          aria-label={`More actions for ${name || 'employee'}`}
                          aria-haspopup="true"
                          aria-expanded={Boolean(cardMenuAnchor)}
                          onClick={(event) => setCardMenuAnchor(event.currentTarget)}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </Box>
                      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1.5 }}>
                        {name || 'Unnamed employee'}
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1 }}>
                        <Typography variant="body2" color="text.secondary" fontWeight={700}>
                          BRANCH
                        </Typography>
                        <Typography variant="body2" textAlign="right">
                          {row.branch || '—'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" fontWeight={700}>
                          STATE
                        </Typography>
                        <Typography variant="body2" textAlign="right">
                          {row.state || (row.isActive ? 'Active' : 'Inactive')}
                        </Typography>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                      <Tooltip title="Fingerprint">
                        <IconButton
                          size="small"
                          aria-label={`Fingerprint ${name}`.trim()}
                          onClick={() => openSaveToMachine(row.employee)}
                        >
                          <Fingerprint fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton size="small" aria-label={`Edit ${name}`.trim()}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Lock/Key">
                        <IconButton size="small" aria-label={`Key ${name}`.trim()}>
                          <VpnKey fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                )
              })}
            </Box>
          )}
        </Box>
      )}

      <Menu
        anchorEl={cardMenuAnchor}
        open={Boolean(cardMenuAnchor)}
        onClose={() => setCardMenuAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => setCardMenuAnchor(null)}>
          <Visibility fontSize="small" sx={{ mr: 1.5 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => setCardMenuAnchor(null)}>
          <Edit fontSize="small" sx={{ mr: 1.5 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={() => setCardMenuAnchor(null)}>
          <Fingerprint fontSize="small" sx={{ mr: 1.5 }} />
          Assign Bio ID
        </MenuItem>
        <MenuItem disabled>
          <LockReset fontSize="small" sx={{ mr: 1.5 }} />
          Reset Password
        </MenuItem>
        <MenuItem onClick={() => setCardMenuAnchor(null)}>
          <HighlightOff fontSize="small" sx={{ mr: 1.5, color: 'error.main' }} />
          Mark as Inactive
        </MenuItem>
      </Menu>

      <Dialog
        open={Boolean(selectedEmployee)}
        onClose={closeSaveToMachine}
        fullWidth
        maxWidth="sm"
        aria-labelledby="save-to-machine-title"
      >
        <DialogTitle
          id="save-to-machine-title"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          Save To Machine
          <IconButton aria-label="Close" onClick={closeSaveToMachine} edge="end">
            <span aria-hidden="true">×</span>
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Alert severity="info" sx={{ mt: 1, mb: 3 }}>
            Machine selection and fingerprint saving require a verified machine API, which is
            not currently configured.
          </Alert>
          {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
            <FormControl fullWidth error={Boolean(formErrors.machine)} disabled>
              <InputLabel id="save-machine-label">Machine</InputLabel>
              <Select
                labelId="save-machine-label"
                label="Machine"
                value={machine}
                onChange={(event) => setMachine(event.target.value)}
              >
                <MenuItem value="" disabled>No machines available</MenuItem>
              </Select>
              <FormHelperText>
                {formErrors.machine || 'Machine options are unavailable.'}
              </FormHelperText>
            </FormControl>
            <TextField
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              error={Boolean(formErrors.name)}
              helperText={formErrors.name}
              required
              fullWidth
            />
            <TextField
              label="Id"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              error={Boolean(formErrors.id)}
              helperText={formErrors.id}
              required
              fullWidth
            />
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={setStartDate}
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true,
                    error: Boolean(formErrors.startDate),
                    helperText: formErrors.startDate,
                  },
                }}
              />
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={setEndDate}
                minDate={startDate ?? undefined}
                slotProps={{
                  textField: {
                    required: true,
                    fullWidth: true,
                    error: Boolean(formErrors.endDate),
                    helperText: formErrors.endDate,
                  },
                }}
              />
            </LocalizationProvider>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Button onClick={closeSaveToMachine}>Cancel</Button>
          <Button variant="contained" onClick={saveToMachine}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default EmployeesPage
