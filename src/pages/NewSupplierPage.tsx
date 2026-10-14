import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Autocomplete,
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material'
import { Link } from 'react-router-dom'
import { getUnitOfMeasurementLookup, getUnitOfMeasurementOptions } from '../api/items'
import { getSupplierFormInfo } from '../api/suppliers'

type SelectOption = {
  code: string
  description: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getOptions(payload: unknown): SelectOption[] {
  if (!Array.isArray(payload)) return []

  const options = payload.flatMap((entry) => {
    if (!isRecord(entry)) return []
    const code = entry.code ?? entry.Code
    const description = entry.description ?? entry.Description
    if ((typeof code !== 'string' && typeof code !== 'number') || typeof description !== 'string') {
      return []
    }

    const normalizedCode = String(code).trim()
    const normalizedDescription = description.trim()
    return normalizedCode && normalizedDescription
      ? [{ code: normalizedCode, description: normalizedDescription }]
      : []
  })

  return [...new Map(options.map((option) => [option.code, option])).values()]
    .sort((first, second) => first.description.localeCompare(second.description))
}

function NewSupplierPage() {
  const { data: formInfo, isLoading: isLoadingFormInfo, error: formInfoError } = useQuery({
    queryKey: ['supplier-form-info'],
    queryFn: getSupplierFormInfo,
  })
  const { data: uomPayload, isLoading: isLoadingUoms, error: uomError } = useQuery({
    queryKey: ['unit-of-measurement'],
    queryFn: getUnitOfMeasurementLookup,
  })
  const formInfoRecord = isRecord(formInfo) ? formInfo : {}
  const stateOptions = getOptions(formInfoRecord.object_state_dfn_by_type)
  const taxOptions = getOptions(formInfoRecord.tax_by_catagory ?? formInfoRecord.tax_by_category)
  const uomOptions = getUnitOfMeasurementOptions(uomPayload)
  const supplierCodeValue = formInfoRecord.new_organization_code
  const supplierCode = typeof supplierCodeValue === 'string' || typeof supplierCodeValue === 'number'
    ? String(supplierCodeValue)
    : ''
  const [isActive, setIsActive] = useState(true)
  const [tradeName, setTradeName] = useState('')
  const [tin, setTin] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [uomCode, setUomCode] = useState('')
  const [remark, setRemark] = useState('')
  const [tab, setTab] = useState('other')
  const [saveUnavailable, setSaveUnavailable] = useState(false)
  const selectedStateCode = stateCode || stateOptions.find((option) => option.description === 'Active')?.code || ''
  const selectedTaxCode = taxCode || taxOptions.find((option) => option.description === 'Not Taxable')?.code || ''

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveUnavailable(true)
  }

  return (
    <main className="supplier-form-page">
      <header className="supplier-form-header">
        <Typography component="h1" variant="h6">New Supplier</Typography>
        <IconButton component={Link} to="/suppliers" aria-label="Close new supplier form" className="supplier-form-close">
          <span aria-hidden="true">×</span>
        </IconButton>
      </header>

      <form className="supplier-form" onSubmit={handleSubmit}>
        <div className="supplier-main-fields">
          <TextField
            label="Supplier Code"
            value={supplierCode}
            InputProps={{ readOnly: true }}
            size="small"
          />
          <FormControlLabel
            control={<Checkbox checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />}
            label="Active"
          />
          <TextField
            label="Trade Name"
            value={tradeName}
            onChange={(event) => setTradeName(event.target.value)}
            size="small"
          />
          <TextField
            label="Tin Number"
            value={tin}
            onChange={(event) => setTin(event.target.value)}
            size="small"
          />
          <FormControl size="small">
            <InputLabel id="supplier-state-label">State</InputLabel>
            <Select
              labelId="supplier-state-label"
              label="State"
              value={selectedStateCode}
              onChange={(event) => setStateCode(event.target.value)}
              disabled={isLoadingFormInfo || stateOptions.length === 0}
            >
              {stateOptions.map((option) => (
                <MenuItem key={option.code} value={option.code}>{option.description}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>

        <Box className="supplier-tabs-section">
          <Tabs value={tab} onChange={(_, value: string) => setTab(value)} aria-label="Supplier details tabs">
            <Tab value="other" label="Other Details" id="supplier-tab-other" aria-controls="supplier-panel-other" />
            <Tab value="address" label="Address" id="supplier-tab-address" aria-controls="supplier-panel-address" />
            <Tab value="relations" label="Relations" id="supplier-tab-relations" aria-controls="supplier-panel-relations" />
          </Tabs>

          <Box role="tabpanel" id="supplier-panel-other" aria-labelledby="supplier-tab-other" hidden={tab !== 'other'} className="supplier-tab-panel">
            <div className="supplier-other-fields">
              <FormControl size="small">
                <InputLabel id="supplier-tax-label">Tax</InputLabel>
                <Select
                  labelId="supplier-tax-label"
                  label="Tax"
                  value={selectedTaxCode}
                  onChange={(event) => setTaxCode(event.target.value)}
                  disabled={isLoadingFormInfo || taxOptions.length === 0}
                >
                  {taxOptions.map((option) => (
                    <MenuItem key={option.code} value={option.code}>{option.description}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Autocomplete
                options={uomOptions}
                value={uomOptions.find((option) => option.code === uomCode) ?? null}
                getOptionLabel={(option) => option.description}
                isOptionEqualToValue={(option, value) => option.code === value.code}
                onChange={(_, option) => setUomCode(option?.code ?? '')}
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
              <TextField
                label="Remark (for internal use)"
                value={remark}
                onChange={(event) => setRemark(event.target.value)}
                size="small"
                multiline
                minRows={2}
              />
            </div>
          </Box>
          <Box role="tabpanel" id="supplier-panel-address" aria-labelledby="supplier-tab-address" hidden={tab !== 'address'} />
          <Box role="tabpanel" id="supplier-panel-relations" aria-labelledby="supplier-tab-relations" hidden={tab !== 'relations'} />
        </Box>

        {formInfoError && <Alert severity="error">Unable to load supplier form options: {formInfoError.message}</Alert>}
        {saveUnavailable && <Alert severity="warning">Supplier save endpoint is not configured.</Alert>}

        <footer className="supplier-form-footer">
          <Button component={Link} to="/suppliers" variant="outlined">Cancel</Button>
          <Button type="submit" variant="contained">Save</Button>
        </footer>
      </form>
    </main>
  )
}

export default NewSupplierPage
