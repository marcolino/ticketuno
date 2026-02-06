import React, { useState } from 'react';
import { DataGrid, GridColDef, GridRowSelectionModel, GridRowId } from '@mui/x-data-grid';
import { Box, Button, Typography } from '@mui/material';

interface Performance {
  id: string;
  date: string;
  time: string;
  seats: number;
}

const EventDetailsDummy: React.FC = () => {
  // Sample data
  const rows: Performance[] = [
    { id: '1', date: '2026-02-10', time: '19:00', seats: 100 },
    { id: '2', date: '2026-02-11', time: '20:00', seats: 150 },
    { id: '3', date: '2026-02-12', time: '19:30', seats: 120 },
    { id: '4', date: '2026-02-13', time: '19:00', seats: 80 },
    { id: '5', date: '2026-02-14', time: '20:00', seats: 200 },
  ];

  // MUI v8: GridRowSelectionModel with Set-based IDs
  const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>({ 
    type: 'include',
    ids: new Set<GridRowId>()
  });

  const columns: GridColDef[] = [
    { field: 'date', headerName: 'Date', width: 150 },
    { field: 'time', headerName: 'Time', width: 100 },
    { field: 'seats', headerName: 'Seats', width: 100, type: 'number' },
  ];

  const handleBulkDelete = () => {
    const selectedIds = Array.from(selectionModel.ids);
    alert(`Would delete ${selectedIds.length} performance(s):\n${selectedIds.join(', ')}`);
    
    // Clear selection after action
    setSelectionModel({ type: 'include', ids: new Set() });
  };

  return (
    <Box sx={{ p: 4 }}>
      <Typography variant="h4" gutterBottom>
        DataGrid Selection Example (MUI v8)
      </Typography>

      {selectionModel.ids.size > 0 && (
        <Box sx={{ mb: 2, p: 2, bgcolor: 'primary.light', borderRadius: 1 }}>
          <Typography variant="body1" sx={{ mb: 1 }}>
            Selected: <strong>{selectionModel.ids.size}</strong> row(s)
          </Typography>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleBulkDelete}
            size="small"
          >
            Delete Selected
          </Button>
        </Box>
      )}

      <Box sx={{ height: 400, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          checkboxSelection
          disableRowSelectionOnClick
          rowSelectionModel={selectionModel}
          onRowSelectionModelChange={(newSelection) => {
            setSelectionModel(newSelection);
          }}
          pageSizeOptions={[5, 10, 25]}
          initialState={{
            pagination: { paginationModel: { pageSize: 5 } },
          }}
        />
      </Box>

      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          <strong>Debug Info:</strong>
        </Typography>
        <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
          {JSON.stringify({
            type: selectionModel.type,
            selectedCount: selectionModel.ids.size,
            selectedIds: Array.from(selectionModel.ids)
          }, null, 2)}
        </Typography>
      </Box>
    </Box>
  );
};

export default EventDetailsDummy;
