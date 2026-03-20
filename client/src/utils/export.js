export function exportToCSV(data, filename) {
  if (!data || data.length === 0) return

  const headers = Object.keys(data[0])
  const csvRows = [
    headers.join(','),
    ...data.map(row =>
      headers.map(header => {
        const val = row[header]
        // Escape commas and quotes in values
        const escaped = String(val ?? '').replace(/"/g, '""')
        return `"${escaped}"`
      }).join(',')
    )
  ]

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function formatRequestForExport(request) {
  return {
    'Event Name': request.event_name,
    'Event Type': request.event_type,
    'Venue': request.venue,
    'Start Date': request.event_start_date ? new Date(request.event_start_date).toLocaleDateString() : '',
    'End Date': request.event_end_date ? new Date(request.event_end_date).toLocaleDateString() : '',
    'Status': request.status,
    'Student Name': request.student_name || '',
    'Student ID': request.student_roll_number || request.student_id || '',
    'Department': request.student_department || '',
    'Created': request.created_at ? new Date(request.created_at).toLocaleDateString() : '',
  }
}
