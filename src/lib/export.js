const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`
export const leaveOf = l => l.entryType === 'full_leave' ? 1 : l.entryType === 'half_leave' ? 0.5 : 0
const typeLabel = l => l.entryType === 'full_leave' ? 'Full leave' : l.entryType === 'half_leave' ? 'Half leave' : 'Work'

export function logsToCSV(logs, fields = []) {
  const cols = ['date', 'userEmail', 'type', 'title', 'description', 'ticketId', 'channel', 'category', 'location', 'hoursSpent']
  const cell = (l, c) => c === 'type' ? typeLabel(l) : l[c]
  const head = [...cols, ...fields.map(f => f.label)]
  return [head.map(esc).join(','), ...logs.map(l => [...cols.map(c => cell(l, c)), ...fields.map(f => {
    const v = l.extra?.[f.key]; return v === true ? 'Yes' : v })].map(esc).join(','))].join('\r\n')
}
export function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob(['\ufeff' + text], { type: `${type};charset=utf-8` }))
  Object.assign(document.createElement('a'), { href: url, download: name }).click()
  URL.revokeObjectURL(url)
}
export function emailSummary(all, label) {
  const logs = all.filter(l => !leaveOf(l))
  const sum = k => logs.reduce((m, l) => (m[l[k]] = (m[l[k]] || 0) + l.hoursSpent, m), {})
  const total = logs.reduce((s, l) => s + l.hoursSpent, 0)
  const lines = o => Object.entries(o).sort((a, b) => b[1] - a[1]).map(([k, v]) => `  - ${k}: ${v.toFixed(1)}h`).join('\n')
  const tickets = logs.filter(l => l.ticketId)
  const leave = all.filter(leaveOf).reduce((m, l) => (m[l.userEmail] = (m[l.userEmail] || 0) + leaveOf(l), m), {})
  const leaveTxt = Object.entries(leave).map(([k, v]) => `  - ${k}: ${v} day${v === 1 ? '' : 's'}`).join('\n') || '  none'
  return `IT Operations Summary (${label})\n\nTotal work hours: ${total.toFixed(1)} | Entries: ${logs.length} | Ticket-linked: ${tickets.length}\n\nBy category:\n${lines(sum('category'))}\n\nBy channel:\n${lines(sum('channel'))}\n\nBy location:\n${lines(sum('location'))}\n\nBy person:\n${lines(sum('userEmail'))}\n\nLeave:\n${leaveTxt}\n\nTickets resolved:\n${tickets.slice(0, 25).map(t => `  - ${t.ticketId}: ${t.title} (${t.userEmail})`).join('\n') || '  none'}\n`
}
