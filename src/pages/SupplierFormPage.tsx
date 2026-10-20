import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Checkbox,
  CircularProgress,
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
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getUnitOfMeasurementLookup, getUnitOfMeasurementOptions } from '../api/items'
import {
  extractSuppliers,
  getSupplierFormInfo,
  getSupplierOptions,
  getSuppliers,
  type SupplierCreateData,
  type SupplierRecord,
  type SupplierUpdateData,
} from '../api/suppliers'

type SupplierFormErrors = Partial<
  Record<'tradeName' | 'tin' | 'state' | 'tax' | 'supplierCode', string>
>

type SupplierFormPageProps = {
  createSupplier?: (data: SupplierCreateData) => Promise<unknown>
  updateSupplier?: (data: SupplierUpdateData) => Promise<unknown>
}

type SupplierFormMode = 'create' | 'update'
type SupplierSubmission = SupplierCreateData | SupplierUpdateData

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readText(record: SupplierRecord | undefined, keys: string[]): string {
  if (!record) return ''

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value).trim()
    }
  }

  return ''
}

function readActive(record: SupplierRecord | undefined): boolean {
  if (!record) return true
  const value = record.isActive
  return value === true || value === 1 || value === '1' || value === 'true'
}

function SupplierFormFields({
  mode,
  code,
  supplier,
  mutation,
}: {
  mode: SupplierFormMode
  code: string
  supplier?: SupplierRecord
  mutation: {
    mutate: (data: SupplierSubmission, onSuccess?: () => void) => void
    isPending: boolean
    error: Error | null
    isSuccess: boolean
    reset: () => void
  }
}) {
  const { mutate, isPending, error: submitError, isSuccess, reset } = mutation
  const navigate = useNavigate()
  const { data: uomPayload, isLoading: isLoadingUoms, error: uomError } = useQuery({
    queryKey: ['unit-of-measurement'],
    queryFn: getUnitOfMeasurementLookup,
  })
  const { data: formInfo, isLoading: isLoadingFormInfo, error: formInfoError } = useQuery({
    queryKey: ['supplier-form-info'],
    queryFn: getSupplierFormInfo,
  })

  const formInfoRecord = isRecord(formInfo) ? formInfo : {}
  const stateOptions = getSupplierOptions(formInfoRecord.object_state_dfn_by_type)
  const taxOptions = getSupplierOptions(
    formInfoRecord.tax_by_catagory ?? formInfoRecord.tax_by_category,
  )
  const uomOptions = getUnitOfMeasurementOptions(uomPayload)
  const createCodeValue = formInfoRecord.new_organization_code
  const createCode = typeof createCodeValue === 'string' || typeof createCodeValue === 'number'
    ? String(createCodeValue)
    : ''
  const supplierCode = mode === 'update' ? code : createCode
  const originalStateCode = readText(supplier, ['objectStateDefnCode'])
  const originalTaxCode = readText(supplier, ['taxType'])
  const [isActive, setIsActive] = useState(() => readActive(supplier))
  const [tradeName, setTradeName] = useState(() => readText(supplier, ['tradeName', 'TradeName']))
  const [brandName, setBrandName] = useState(() => readText(supplier, ['brandName', 'brandmes', 'BrandName']))
  const [tin, setTin] = useState(() => readText(supplier, ['TIN', 'tin']))
  const [stateCode, setStateCode] = useState(originalStateCode)
  const [taxCode, setTaxCode] = useState(originalTaxCode)
  const [uomCode, setUomCode] = useState(() => readText(supplier, ['uomCode', 'UOMCode', 'uom']))
  const [remark, setRemark] = useState(() => readText(supplier, ['remark', 'Remark']))
  const [tab, setTab] = useState('other')
  const [formErrors, setFormErrors] = useState<SupplierFormErrors>({})
  const selectedStateCode = mode === 'create'
    ? stateCode || stateOptions.find((option) => option.description === 'Active')?.code || ''
    : stateCode
  const selectedTaxCode = mode === 'create'
    ? taxCode || taxOptions.find((option) => option.description === 'Not Taxable')?.code || ''
    : taxCode

  useEffect(() => {
    if (!isSuccess) return

    const redirectTimer = window.setTimeout(() => {
      reset()
      navigate('/suppliers', { replace: true })
    }, 3000)

    return () => window.clearTimeout(redirectTimer)
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
    if (
      !selectedStateCode
      || (!stateOptions.some((option) => option.code === selectedStateCode)
        && !(mode === 'update' && selectedStateCode === originalStateCode))
    ) {
      errors.state = 'Select a valid State.'
    }
    if (
      !selectedTaxCode
      || (!taxOptions.some((option) => option.code === selectedTaxCode)
        && !(mode === 'update' && selectedTaxCode === originalTaxCode))
    ) {
      errors.tax = 'Select a valid Tax.'
    }

    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    const payload: SupplierCreateData = {
      type: 7,
      tradeName: tradeName.trim(),
      brandName: brandName.trim() || tradeName.trim(),
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
      address: mode === 'update' && Array.isArray(supplier?.address) ? supplier.address : [],
      relation: mode === 'update' && Array.isArray(supplier?.relation) ? supplier.relation : [],
    }

    if (mode === 'update') {
      mutate({ ...payload, code: supplierCode })
    } else {
      mutate(payload, () => {
        setIsActive(true)
        setTradeName('')
        setBrandName('')
        setTin('')
        setStateCode('')
        setTaxCode('')
        setUomCode('')
        setRemark('')
        setTab('other')
        setFormErrors({})
      })
    }
  }

  const isLoading = isLoadingFormInfo || isLoadingUoms

  return (
    <main className="supplier-form-page">
      <header className="supplier-form-header">
        <Typography component="h1" variant="h6">
          {mode === 'create' ? 'New Supplier' : 'Edit Supplier'}
        </Typography>
        <IconButton
          component={Link}
          to="/suppliers"
          aria-label={`Close ${mode === 'create' ? 'new' : 'edit'} supplier form`}
          className="supplier-form-close"
        >
          <span aria-hidden="true">×</span>
        </IconButton>
      </header>

      <form className="supplier-form" onSubmit={handleSubmit} noValidate>
        <div className="supplier-main-fields">
          <TextField
            label="Supplier Code"
            value={supplierCode}
            InputProps={{ readOnly: true }}
            size="small"
          />
          <FormControlLabel
            control={(
              <Checkbox
                checked={isActive}
                onChange={(event) => {
                  setIsActive(event.target.checked)
                  reset()
                }}
              />
            )}
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
            label="Brand Name"
            value={brandName}
            onChange={(event) => {
              setBrandName(event.target.value)
              reset()
            }}
            size="small"
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
              disabled={isLoadingFormInfo || Boolean(formInfoError) || stateOptions.length === 0}
            >
              {selectedStateCode && !stateOptions.some((option) => option.code === selectedStateCode) && (
                <MenuItem value={selectedStateCode}>{selectedStateCode}</MenuItem>
              )}
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

          <Box
            role="tabpanel"
            id="supplier-panel-other"
            aria-labelledby="supplier-tab-other"
            hidden={tab !== 'other'}
            className="supplier-tab-panel"
          >
            <div className="supplier-other-fields">
              <FormControl size="small" error={Boolean(formErrors.tax)} required>
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
                  disabled={isLoadingFormInfo || Boolean(formInfoError) || taxOptions.length === 0}
                >
                  {selectedTaxCode && !taxOptions.some((option) => option.code === selectedTaxCode) && (
                    <MenuItem value={selectedTaxCode}>{selectedTaxCode}</MenuItem>
                  )}
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
                onChange={(_, option) => {
                  setUomCode(option?.code ?? '')
                  reset()
                }}
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
          <Box
            role="tabpanel"
            id="supplier-panel-address"
            aria-labelledby="supplier-tab-address"
            hidden={tab !== 'address'}
          />
          <Box
            role="tabpanel"
            id="supplier-panel-relations"
            aria-labelledby="supplier-tab-relations"
            hidden={tab !== 'relations'}
          />
        </Box>

        {isLoading && (
          <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
            <Typography sx={{ ml: 1 }}>Loading supplier form options...</Typography>
          </Box>
        )}
        {formInfoError && (
          <Alert severity="error">Unable to load supplier form options: {formInfoError.message}</Alert>
        )}
        {Object.values(formErrors).map((message) => (
          <Alert severity="error" key={message}>{message}</Alert>
        ))}
        {submitError && (
          <Alert severity="error">
            Unable to {mode === 'create' ? 'create' : 'update'} supplier: {submitError.message}
          </Alert>
        )}
        {isSuccess && (
          <Alert severity="success">
            {mode === 'create' ? 'Supplier successfully created.' : 'Supplier successfully updated.'}
          </Alert>
        )}
        {mode === 'create' && !formInfoError && !supplierCode && !isLoadingFormInfo && (
          <Alert severity="warning">Supplier Code is unavailable; supplier details cannot be submitted.</Alert>
        )}
        {uomError && <Alert severity="error">Unable to load UOM options: {uomError.message}</Alert>}

        <footer className="supplier-form-footer">
          <Button component={Link} to="/suppliers" variant="outlined">Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isLoadingFormInfo || Boolean(formInfoError) || isPending || isSuccess}
          >
            {isPending ? 'Saving...' : mode === 'create' ? 'Save' : 'Save Changes'}
          </Button>
        </footer>
      </form>
    </main>
  )
}

function SupplierFormPage({ createSupplier, updateSupplier }: SupplierFormPageProps) {
  const { code = '' } = useParams<{ code: string }>()
  const mode: SupplierFormMode = code ? 'update' : 'create'
  const queryClient = useQueryClient()
  const { data, isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: getSuppliers,
    enabled: mode === 'update',
  })
  const supplier = mode === 'update'
    ? extractSuppliers(data).find((record) => readText(record, ['OrganizationCode']) === code)
    : undefined
  const mutation = useMutation<unknown, Error, SupplierSubmission>({
    mutationFn: (dataToSubmit) => {
      if ('code' in dataToSubmit) {
        if (!updateSupplier) {
          throw new Error('Supplier update function is not configured for the edit route.')
        }
        return updateSupplier(dataToSubmit)
      }

      if (!createSupplier) {
        throw new Error('Supplier create function is not configured for the create route.')
      }
      return createSupplier(dataToSubmit)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['suppliers'],
        refetchType: 'all',
      })
    },
  })
  const mutateSupplier = (dataToSubmit: SupplierSubmission, onSuccess?: () => void) => {
    mutation.mutate(dataToSubmit, { onSuccess })
  }

  if (mode === 'update' && isLoading) {
    return (
      <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading supplier...</Typography>
      </Box>
    )
  }

  if (mode === 'update' && error) {
    return <Alert severity="error">Unable to load supplier: {error.message}</Alert>
  }

  if (mode === 'update' && !supplier) {
    return (
      <Box sx={{ maxWidth: 900, mx: 'auto', px: 3, py: 4 }}>
        <Alert severity="error">Supplier {code || '(missing code)'} was not found.</Alert>
        <Button component={Link} to="/suppliers" sx={{ mt: 2 }}>Back to suppliers</Button>
      </Box>
    )
  }

  return (
    <SupplierFormFields
      key={code || 'create-supplier'}
      mode={mode}
      code={code}
      supplier={supplier}
      mutation={{
        mutate: mutateSupplier,
        isPending: mutation.isPending,
        error: mutation.error,
        isSuccess: mutation.isSuccess,
        reset: mutation.reset,
      }}
    />
  )
}

export default SupplierFormPage
