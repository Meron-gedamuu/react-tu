import { useEffect, useState, type FormEvent } from 'react'
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
import { Link, useNavigate, useOutletContext } from 'react-router-dom'
import { getUnitOfMeasurementLookup, getUnitOfMeasurementOptions } from '../api/items'
import { getSupplierFormInfo, type SupplierCreateData } from '../api/suppliers'
import type { SupplierFormMutationContext } from './SuppliersPage'

type SelectOption = {
  code: string
  description: string
}

type SupplierFormErrors = Partial<Record<'tradeName' | 'tin' | 'state' | 'tax' | 'supplierCode', string>>

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
  const { mutate, isPending, error: createError, isSuccess, reset } = useOutletContext<SupplierFormMutationContext>()
  const navigate = useNavigate()
  const { data: formInfo, isLoading: isLoadingFormInfo, error: formInfoError } = useQuery({
    queryKey: ['supplier-form-info'],
    queryFn: getSupplierFormInfo,
  })
  
  const formInfoRecord = isRecord(formInfo) ? formInfo : {}
  const stateOptions = getOptions(formInfoRecord.object_state_dfn_by_type)
  const taxOptions = getOptions(formInfoRecord.tax_by_catagory ?? formInfoRecord.tax_by_category)
  const supplierCodeValue = formInfoRecord.new_organization_code
  const supplierCode = typeof supplierCodeValue === 'string' || typeof supplierCodeValue === 'number'
    ? String(supplierCodeValue)
    : ''
  const [isActive, setIsActive] = useState(true)
  const [tradeName, setTradeName] = useState('')
  const [tin, setTin] = useState('')
  const [stateCode, setStateCode] = useState('')
  const [taxCode, setTaxCode] = useState('')
  const [remark, setRemark] = useState('')
  const [tab, setTab] = useState('other')
  const [formErrors, setFormErrors] = useState<SupplierFormErrors>({})
  const selectedStateCode = stateCode || stateOptions.find((option) => option.description === 'Active')?.code || ''
  const selectedTaxCode = taxCode || taxOptions.find((option) => option.description === 'Not Taxable')?.code || ''

  useEffect(() => {
    if (!isSuccess) return

    setIsActive(true)
    setTradeName('')
    setTin('')
    setStateCode('')
    setTaxCode('')
    setRemark('')
    setTab('other')
    setFormErrors({})
    reset()
    navigate('/suppliers', { replace: true })
  }, [isSuccess, navigate, reset])

  function clearFormError(field: keyof SupplierFormErrors) {
    setFormErrors((current) => {
      const next = { ...current }
      delete next[field]
      return next
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const errors: SupplierFormErrors = {}
    if (!supplierCode.trim()) errors.supplierCode = 'Supplier Code is not available.'
    if (!tradeName.trim()) errors.tradeName = 'Trade Name is required.'
    if (!tin.trim()) errors.tin = 'TIN Number is required.'
    if (!selectedStateCode || !stateOptions.some((option) => option.code === selectedStateCode)) {
      errors.state = 'Select a valid State.'
    }
    if (!selectedTaxCode || !taxOptions.some((option) => option.code === selectedTaxCode)) {
      errors.tax = 'Select a valid Tax.'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload: SupplierCreateData = {
      type: 7,
      tradeName: tradeName.trim(),
      brandName: tradeName.trim(),
      businessType: 'LKUP000000121',
      preference: 'PREFE000001057',
      isActive,
      remark: remark.trim(),
      organizationUnit: 'OUD100007979',
      tax: selectedTaxCode,
      orgUnitDef: 'OUD100007979',
      activitiyDefinition: 'AD-000000009',
      objectStateDefinition: [selectedStateCode],
      user: 'User000000037',
      identification: { idNumber: tin.trim() },
      address: [],
      relation: [],
    }

    mutate(payload)
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
            control={<Checkbox
              checked={isActive}
              onChange={(event) => {
                setIsActive(event.target.checked)
                reset()
              }}
            />}
            label="Active"
          />
          <TextField
            label="Trade Name"
            value={tradeName}
            onChange={(event) => {
              setTradeName(event.target.value)
              reset()
              clearFormError('tradeName')
            }}
            size="small"
            required
            error={Boolean(formErrors.tradeName)}
            helperText={formErrors.tradeName}
          />
          <TextField
            label="Tin Number"
            value={tin}
            onChange={(event) => {
              setTin(event.target.value)
              reset()
              clearFormError('tin')
            }}
            size="small"
            required
            error={Boolean(formErrors.tin)}
            helperText={formErrors.tin}
          />
          <FormControl size="small" error={Boolean(formErrors.state)} required>
            <InputLabel id="supplier-state-label">State</InputLabel>
            <Select
              labelId="supplier-state-label"
              label="State"
              value={selectedStateCode}
              onChange={(event) => {
                setStateCode(event.target.value)
                reset()
                clearFormError('state')
              }}
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
                  onChange={(event) => {
                    setTaxCode(event.target.value)
                    reset()
                    clearFormError('tax')
                  }}
                  disabled={isLoadingFormInfo || taxOptions.length === 0}
                  error={Boolean(formErrors.tax)}
                >
                  {taxOptions.map((option) => (
                    <MenuItem key={option.code} value={option.code}>{option.description}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            
              <TextField
                label="Remark (for internal use)"
                value={remark}
                onChange={(event) => {
                  setRemark(event.target.value)
                  reset()
                }}
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
        {Object.values(formErrors).map((message) => (
          <Alert severity="error" key={message}>{message}</Alert>
        ))}
        {createError && <Alert severity="error">Unable to create supplier: {createError.message}</Alert>}
        {isSuccess && <Alert severity="success">Supplier created successfully.</Alert>}
        {!formInfoError && !supplierCode && !isLoadingFormInfo && (
          <Alert severity="warning">Supplier Code is unavailable; supplier details cannot be submitted.</Alert>
        )}

        <footer className="supplier-form-footer">
          <Button component={Link} to="/suppliers" variant="outlined">Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoadingFormInfo || Boolean(formInfoError) || isPending}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </footer>
      </form>
    </main>
  )
}

export default NewSupplierPage
