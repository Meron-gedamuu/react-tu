import { useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Autocomplete,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { extractItems, getItems, type ItemRecord } from '../api/items'
import { extractSuppliers, getCustomers, type SupplierRecord } from '../api/suppliers'

type ProformaLine = {
  id: number
  itemCode: string
  quantity: string
  unitPrice: string
  taxRate: string
}

type ProformaDraft = {
  id: number
  customer: string
  documentNumber: string
  date: string
  lines: ProformaLine[]
  subtotal: number
  taxTotal: number
  grandTotal: number
}

type ProformaCustomerOption = {
  code: string
  label: string
}

function textValue(record: ItemRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return ''
}

function numericValue(value: string): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function money(value: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'ETB',
    minimumFractionDigits: 2,
  }).format(value)
}

function ProformaPage() {
  const [isCreating, setIsCreating] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [drafts, setDrafts] = useState<ProformaDraft[]>([])
  const [nextDraftId, setNextDraftId] = useState(1)
  const [isExporting, setIsExporting] = useState(false)
  const [exportMessage, setExportMessage] = useState('')
  const [exportError, setExportError] = useState('')
  const [customer, setCustomer] = useState<ProformaCustomerOption | null>(null)
  const [documentNumber] = useState('PI-02470-2026')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [lines, setLines] = useState<ProformaLine[]>([
    { id: 1, itemCode: '', quantity: '1', unitPrice: '', taxRate: '' },
  ])
  const [nextLineId, setNextLineId] = useState(2)
  const [savedMessage, setSavedMessage] = useState('')
  const {
    data: itemPayload,
    isLoading: isLoadingItems,
    error: itemsError,
  } = useQuery({
    queryKey: ['proforma-item-options'],
    queryFn: () => getItems(),
    enabled: isCreating,
  })
  const {
    data: customerPayload,
    isLoading: isLoadingCustomers,
    error: customersError,
  } = useQuery({
    queryKey: ['proforma-customer-options'],
    queryFn: getCustomers,
    enabled: isCreating,
  })
  const items = useMemo(() => extractItems(itemPayload), [itemPayload])
  const customers = useMemo(
    () => extractSuppliers(customerPayload).flatMap((record: SupplierRecord) => {
      const code = textValue(
        record,
        ['OrganizationCode', 'organizationCode', 'Code', 'code'],
      )
      const name = textValue(
        record,
        ['TradeName', 'tradeName', 'OrganizationName', 'organizationName', 'Name', 'name'],
      )
      const label = name && code && name !== code ? `${name} (${code})` : name || code
      return label ? [{ code: code || label, label }] : []
    }),
    [customerPayload],
  )
  const selectedItems = lines.map((line) => items.find(
    (item) => textValue(item, ['ArticleCode', 'articleCode', 'Code', 'code']) === line.itemCode,
  ))
  const subtotal = lines.reduce(
    (total, line) => total + numericValue(line.quantity) * numericValue(line.unitPrice),
    0,
  )
  const taxTotal = lines.reduce(
    (total, line) =>
      total
      + numericValue(line.quantity)
      * numericValue(line.unitPrice)
      * numericValue(line.taxRate)
      / 100,
    0,
  )
  const grandTotal = subtotal + taxTotal

  function startNewDocument() {
    setCustomer(null)
    setDate(new Date().toISOString().slice(0, 10))
    setLines([{ id: 1, itemCode: '', quantity: '1', unitPrice: '', taxRate: '' }])
    setNextLineId(2)
    setSavedMessage('')
    setIsCreating(true)
  }

  function updateLine(id: number, changes: Partial<ProformaLine>) {
    setLines((current) => current.map((line) => (
      line.id === id ? { ...line, ...changes } : line
    )))
  }

  function chooseItem(lineId: number, itemCode: string) {
    const selected = items.find(
      (item) => textValue(item, ['ArticleCode', 'articleCode', 'Code', 'code']) === itemCode,
    )
    const priceValue = selected?.unitPrice
    updateLine(lineId, {
      itemCode,
      unitPrice: typeof priceValue === 'number' && Number.isFinite(priceValue)
        ? String(priceValue)
        : '',
    })
  }

  function saveDraft() {
    const draft: ProformaDraft = {
      id: nextDraftId,
      customer: customer?.label ?? '',
      documentNumber,
      date,
      lines,
      subtotal,
      taxTotal,
      grandTotal,
    }
    setDrafts((current) => [draft, ...current])
    setNextDraftId((id) => id + 1)
    setSavedMessage('Draft saved in this page session only. Backend Proforma saving is not configured.')
    setIsCreating(false)
  }

  async function exportDrafts() {
    setExportMessage('')
    setExportError('')

    if (drafts.length === 0) {
      setExportMessage('There are no Proforma records available to export.')
      return
    }

    setIsExporting(true)

    try {
      const XLSX = await import('xlsx')
      const summaryRows = drafts.map((draft) => [
        draft.documentNumber,
        draft.date,
        draft.customer,
        draft.lines.reduce((sum, line) => sum + numericValue(line.quantity), 0),
        draft.subtotal,
        draft.taxTotal,
        draft.grandTotal,
        'Local session draft',
      ])
      const lineItemRows = drafts.flatMap((draft) => draft.lines.map((line) => {
        const item = items.find(
          (entry) => textValue(entry, ['ArticleCode', 'articleCode', 'Code', 'code']) === line.itemCode,
        )
        const quantity = numericValue(line.quantity)
        const unitPrice = numericValue(line.unitPrice)
        const taxRate = numericValue(line.taxRate)
        const lineSubtotal = quantity * unitPrice
        const taxAmount = lineSubtotal * taxRate / 100

        return [
          draft.documentNumber,
          draft.date,
          line.itemCode,
          item
            ? textValue(item, ['ArticleName', 'articleName', 'Name', 'name'])
            : '',
          quantity,
          item ? textValue(item, ['uomDesc', 'UOMDesc']) : '',
          unitPrice,
          taxRate,
          lineSubtotal,
          taxAmount,
          lineSubtotal + taxAmount,
        ]
      }))
      const workbook = XLSX.utils.book_new()
      const summarySheet = XLSX.utils.aoa_to_sheet([
        [
          'Document Number',
          'Date',
          'Customer',
          'Quantity',
          'Subtotal',
          'Tax',
          'Grand Total',
          'Record Status',
        ],
        ...summaryRows,
      ])
      summarySheet['!cols'] = [
        { wch: 24 }, { wch: 16 }, { wch: 32 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 22 },
      ]
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Proformas')

      const lineItemsSheet = XLSX.utils.aoa_to_sheet([
        [
          'Document Number',
          'Date',
          'Item Code',
          'Item Name',
          'Quantity',
          'UOM',
          'Unit Price',
          'Tax Rate (%)',
          'Subtotal',
          'Tax Amount',
          'Line Total',
        ],
        ...lineItemRows,
      ])
      lineItemsSheet['!cols'] = [
        { wch: 24 }, { wch: 16 }, { wch: 26 }, { wch: 32 }, { wch: 14 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
      ]
      XLSX.utils.book_append_sheet(workbook, lineItemsSheet, 'Line Items')
      XLSX.writeFile(workbook, 'Proforma.xlsx')
    } catch (error) {
      setExportError(
        error instanceof Error ? `Unable to export Proforma records: ${error.message}` : 'Unable to export Proforma records.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <Box className="proforma-page">
      <Box className="proforma-heading">
        <Box>
          <Typography component="p" className="eyebrow">CATALOG</Typography>
          <Typography component="h1" variant="h4" sx={{ mb: 1, fontWeight: 750 }}>
            Proforma
          </Typography>
          <Typography color="text.secondary">
            View and prepare proforma documents.
          </Typography>
        </Box>
        {!isCreating && (
          <Box className="proforma-page-actions">
            <Button
              variant="outlined"
              onClick={exportDrafts}
              disabled={isExporting}
              title="Exports the Proforma records listed below"
            >
              {isExporting ? 'Exporting...' : 'Export to Excel'}
            </Button>
            <Button variant="contained" onClick={startNewDocument}>
              + New Proforma
            </Button>
          </Box>
        )}
      </Box>

      {savedMessage && <Alert severity="info" sx={{ mb: 2 }}>{savedMessage}</Alert>}
      {exportMessage && <Alert severity="info" sx={{ mb: 2 }}>{exportMessage}</Alert>}
      {exportError && <Alert severity="error" sx={{ mb: 2 }}>{exportError}</Alert>}

      {isCreating ? (
        <Paper component="section" className="proforma-form" variant="outlined">
          <Box className="proforma-form-heading">
            <Typography component="h2" variant="h5" sx={{ fontWeight: 700 }}>
              New Proforma
            </Typography>
            <Button aria-label="Close new Proforma form" onClick={() => setIsCreating(false)}>
              Close
            </Button>
          </Box>

          <Alert severity="warning" sx={{ mb: 3 }}>
            Document-number generation and backend saving are pending verified API contracts.
            This form can only save a temporary local draft.
          </Alert>

          <Box className="proforma-form-fields" sx={{ gridTemplateColumns: 'minmax(0, 1fr)' }}>
            <Autocomplete
              options={customers}
              value={customer}
              loading={isLoadingCustomers}
              getOptionLabel={(option) => option.label}
              isOptionEqualToValue={(option, value) => option.code === value.code}
              onChange={(_event, value) => setCustomer(value)}
              noOptionsText={customersError ? 'Unable to load customers' : 'No customers available'}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Customer"
                  error={Boolean(customersError)}
                  helperText={
                    customersError
                      ? `Unable to load customers: ${customersError.message}`
                      : isLoadingCustomers
                        ? 'Loading customers...'
                        : undefined
                  }
                />
              )}
            />
            <TextField
              label="Document Code"
              value={documentNumber}
              InputProps={{ readOnly: true }}
              fullWidth
            />
            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>

          <Box className="proforma-lines-heading">
            <Typography component="h3" variant="h6" sx={{ fontWeight: 700 }}>
              Item Table
            </Typography>
            <Button
              variant="outlined"
              onClick={() => {
                setLines((current) => [
                  ...current,
                  { id: nextLineId, itemCode: '', quantity: '1', unitPrice: '', taxRate: '' },
                ])
                setNextLineId((id) => id + 1)
              }}
            >
              + Add item
            </Button>
          </Box>

          {isLoadingItems ? (
            <Box role="status" sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 4 }}>
              <CircularProgress size={22} />
              <Typography>Loading available items...</Typography>
            </Box>
          ) : itemsError ? (
            <Alert severity="error">Unable to load items: {itemsError.message}</Alert>
          ) : (
            <TableContainer className="proforma-table-container">
              <Table className="proforma-items-table" size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item Details</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>UOM</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Tax (%)</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell aria-label="Row actions" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, index) => {
                    const item = selectedItems[index]
                    const lineSubtotal = numericValue(line.quantity) * numericValue(line.unitPrice)
                    const lineTotal = lineSubtotal
                      + lineSubtotal * numericValue(line.taxRate) / 100
                    return (
                      <TableRow key={line.id}>
                        <TableCell className="proforma-item-select-cell">
                          <FormControl fullWidth size="small">
                            <InputLabel id={`proforma-item-label-${line.id}`}>Item</InputLabel>
                            <Select
                              labelId={`proforma-item-label-${line.id}`}
                              label="Item"
                              value={line.itemCode}
                              onChange={(event) => chooseItem(line.id, event.target.value)}
                            >
                              {items.map((option) => {
                                const optionCode = textValue(
                                  option,
                                  ['ArticleCode', 'articleCode', 'Code', 'code'],
                                )
                                const optionName = textValue(
                                  option,
                                  ['ArticleName', 'articleName', 'Name', 'name'],
                                )
                                return (
                                  <MenuItem key={optionCode} value={optionCode}>
                                    {optionCode}{optionName ? ` - ${optionName}` : ''}
                                  </MenuItem>
                                )
                              })}
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={line.quantity}
                            onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                            inputProps={{
                              'aria-label': `Quantity for item row ${index + 1}`,
                              min: 0,
                              step: 'any',
                            }}
                          />
                        </TableCell>
                        <TableCell>{item ? textValue(item, ['uomDesc', 'UOMDesc']) : '—'}</TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={line.unitPrice}
                            onChange={(event) => updateLine(line.id, { unitPrice: event.target.value })}
                            inputProps={{
                              'aria-label': `Unit price for item row ${index + 1}`,
                              min: 0,
                              step: 'any',
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            type="number"
                            size="small"
                            value={line.taxRate}
                            onChange={(event) => updateLine(line.id, { taxRate: event.target.value })}
                            inputProps={{
                              'aria-label': `Tax rate for item row ${index + 1}`,
                              min: 0,
                              step: 'any',
                            }}
                          />
                        </TableCell>
                        <TableCell>{money(lineTotal)}</TableCell>
                        <TableCell>
                          <Button
                            color="error"
                            size="small"
                            aria-label={`Remove item row ${index + 1}`}
                            disabled={lines.length === 1}
                            onClick={() => setLines((current) => current.filter(
                              (entry) => entry.id !== line.id,
                            ))}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {lines.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        Add an item to calculate document totals.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          <Box className="proforma-totals" aria-live="polite">
            <Typography>Subtotal: <strong>{money(subtotal)}</strong></Typography>
            <Typography>Tax: <strong>{money(taxTotal)}</strong></Typography>
            <Typography variant="h6">Grand Total: <strong>{money(grandTotal)}</strong></Typography>
          </Box>

          <Box className="proforma-form-actions">
            <Button variant="contained" onClick={saveDraft}>Save</Button>
            <Button variant="outlined" onClick={() => setIsPreviewing(true)}>Preview</Button>
            <Button variant="outlined" onClick={() => setIsCreating(false)}>Cancel</Button>
          </Box>
        </Paper>
      ) : (
        <Paper component="section" className="proforma-list" variant="outlined">
          <Typography component="h2" variant="h6" sx={{ fontWeight: 700 }}>
            Proforma list
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            This list and Excel export include only drafts saved locally during this page session.
            Backend Proforma records and saving require verified API endpoints.
          </Alert>
          {drafts.length === 0 ? (
            <Box className="proforma-empty-state">
              <Typography color="text.secondary">No Proforma drafts in this session.</Typography>
            </Box>
          ) : (
            <TableContainer className="proforma-table-container">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Document Number</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Quantity</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {drafts.map((draft) => (
                    <TableRow key={draft.id}>
                      <TableCell>{draft.documentNumber || '—'}</TableCell>
                      <TableCell>{draft.date || '—'}</TableCell>
                      <TableCell>{draft.customer || 'Not selected'}</TableCell>
                      <TableCell>
                        {draft.lines.reduce((sum, line) => sum + numericValue(line.quantity), 0)}
                      </TableCell>
                      <TableCell>{money(draft.grandTotal)}</TableCell>
                      <TableCell>Local draft</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {isPreviewing && (
        <Box className="proforma-preview-backdrop">
          <Paper
            className="proforma-preview"
            component="section"
            role="dialog"
            aria-modal="true"
            aria-labelledby="proforma-preview-title"
          >
            <Typography id="proforma-preview-title" component="h2" variant="h5" sx={{ mb: 2 }}>
              Proforma Preview
            </Typography>
            <Typography>Document Number: {documentNumber || 'Not assigned'}</Typography>
            <Typography>Date: {date || 'Not set'}</Typography>
            <Typography>Customer: {customer?.label || 'Not selected'}</Typography>
            <TableContainer className="proforma-table-container">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Item</TableCell>
                    <TableCell>Qty</TableCell>
                    <TableCell>Unit Price</TableCell>
                    <TableCell>Tax</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {lines.map((line, index) => {
                    const item = selectedItems[index]
                    const lineSubtotal = numericValue(line.quantity) * numericValue(line.unitPrice)
                    return (
                      <TableRow key={line.id}>
                        <TableCell>
                          {item
                            ? textValue(item, ['ArticleName', 'articleName', 'ArticleCode'])
                            : 'No item selected'}
                        </TableCell>
                        <TableCell>{line.quantity}</TableCell>
                        <TableCell>{money(numericValue(line.unitPrice))}</TableCell>
                        <TableCell>{line.taxRate || '0'}%</TableCell>
                        <TableCell>
                          {money(lineSubtotal + lineSubtotal * numericValue(line.taxRate) / 100)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box className="proforma-totals">
              <Typography>Subtotal: <strong>{money(subtotal)}</strong></Typography>
              <Typography>Tax: <strong>{money(taxTotal)}</strong></Typography>
              <Typography variant="h6">Grand Total: <strong>{money(grandTotal)}</strong></Typography>
            </Box>
            <Box className="proforma-form-actions">
              <Button variant="contained" onClick={() => setIsPreviewing(false)}>Close Preview</Button>
              <Button onClick={() => window.print()}>Print</Button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  )
}

export default ProformaPage
