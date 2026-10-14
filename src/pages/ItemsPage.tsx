import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material'
import { DataGrid, type GridColDef } from '@mui/x-data-grid'
import { Link } from 'react-router-dom'
import type { ItemRecord } from '../api/items'
import dayjs from 'dayjs'

type ItemsPageProps = {
  items: ItemRecord[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  onOpenProductsSearch: () => void
}

type ItemsGridProps = {
  items: ItemRecord[]
  isLoading: boolean
  isFetching: boolean
  error: Error | null
  ariaLabel: string
}

function NoItemsOverlay() {
  return (
    <Box sx={{ display: 'grid', height: '100%', placeItems: 'center' }}>
      <Typography color="text.secondary">No items found</Typography>
    </Box>
  )
}
 const columns: GridColDef[] = [
  {
   field:'ArticleCode',
   headerName: 'Article Code',
   flex:1,
  },
  {
   field:'ArticleName',
   headerName: 'Name',
   flex:1,
  },
  {
   field:'gslType',
   headerName: 'Type',
   flex:.5
  },
  {
   field:'startTimStamp',
   headerName: 'Start Time Stamp',
   valueFormatter: ({ value }) => dayjs(value).format('YYYY-MM-DD'),
   flex:1,
  },
   {
   field:'isActive',
   headerName: 'Status',
   renderCell: ({ value }) => (value ? 'Active' : 'Inactive'),
  },

 ]
export function ItemsGrid({ items, isLoading, isFetching, error, ariaLabel }: ItemsGridProps) { 
  const rows = items.map((item, index) => ({
    ...item,
    id: item.id ?? item.ID ?? item.articleId ?? item.articleID ?? index,
  }))

  return isLoading ? (
    <Box role="status" sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
      <CircularProgress />
    </Box>
  ) : error ? (
    <Alert severity="error">Unable to load items: {error.message}</Alert>
  ) : (
    <Box sx={{ height: 'min(72vh, 760px)', minHeight: 360, width: '100%' }}>
      <DataGrid
        aria-label={ariaLabel}
        rows={rows}
        columns={columns}
        loading={isFetching}
        slots={{ noRowsOverlay: NoItemsOverlay }}
        pageSizeOptions={[10, 25, 50]}
        initialState={{ pagination: { paginationModel: { pageSize: 25, page: 0 } } }}
        disableRowSelectionOnClick
      />
    </Box>
  )
}

function ItemsPage({ items, isLoading, isFetching, error, onOpenProductsSearch }: ItemsPageProps) {
  return (
    <Box sx={{ maxWidth: 1440, mx: 'auto', px: { xs: 2, md: 4 }, py: 4 }}>
      <Button component={Link} to="/" aria-label="Back to home" sx={{ mb: 2, ml: -1 }}>
        <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>←</span>
        <span style={{ marginLeft: 8 }}>Back</span>
      </Button>
      <Button onClick={onOpenProductsSearch} variant="outlined" sx={{ mb: 2, ml: 1 }}>
        Search Products
      </Button>
      <Typography component="h1" variant="h4" sx={{ mb: 3, fontWeight: 800 }}>
        Registered items
      </Typography>

      <ItemsGrid
        items={items}
        isLoading={isLoading}
        isFetching={isFetching}
        error={error}
        ariaLabel="Registered items"
      />
    </Box>
  )
}

export default ItemsPage