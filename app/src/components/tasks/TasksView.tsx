'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, ChevronDown, LayoutGrid, Table2, List, Calendar, X, Check } from 'lucide-react'

type TaskPriority = 'high' | 'medium' | 'low'
type TaskStatus = 'todo' | 'in_progress' | 'waiting' | 'done'

interface Task {
  _id: string
  workspaceId: string
  contactId: string | null
  title: string
  contactName: string | null
  priority: TaskPriority
  status: TaskStatus
  dueDate: string | null
  createdAt: string
  updatedAt: string
}

interface ColumnDef {
  id: TaskStatus
  label: string
  color: string
}

const WORKSPACE_ID = 'ws-1'
const TOAST_DURATION_MS = 3000

const COLUMNS: ColumnDef[] = [
  { id: 'todo', label: 'To Do', color: '#2563EB' },
  { id: 'in_progress', label: 'In Progress', color: '#D97706' },
  { id: 'waiting', label: 'Waiting', color: '#7C3AED' },
  { id: 'done', label: 'Done', color: '#059669' },
]

const PRIORITY_STYLES: Record<TaskPriority, { bg: string; color: string; label: string }> = {
  high: { bg: 'rgba(220,38,38,0.08)', color: '#DC2626', label: 'High' },
  medium: { bg: 'rgba(217,119,6,0.1)', color: '#D97706', label: 'Medium' },
  low: { bg: 'rgba(107,114,128,0.1)', color: '#6B7280', label: 'Low' },
}

const TABS = [
  { id: 'kanban', label: 'Kanban', Icon: LayoutGrid },
  { id: 'table', label: 'Table', Icon: Table2 },
  { id: 'list', label: 'List', Icon: List },
  { id: 'calendar', label: 'Calendar', Icon: Calendar },
]

const STATIC_FILTERS = ['All Types', 'All Stages', 'All Contacts']

type PriorityFilter = 'all' | TaskPriority
const PRIORITY_CYCLE: PriorityFilter[] = ['all', 'high', 'medium', 'low']
const PRIORITY_FILTER_LABELS: Record<PriorityFilter, string> = {
  all: 'All Priorities',
  high: 'High Priority',
  medium: 'Medium Priority',
  low: 'Low Priority',
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) {
    throw new Error(`Request failed with status ${res.status}`)
  }
  const body = (await res.json()) as { data: T }
  return body.data
}

function formatDueDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function isOverdue(task: Task): boolean {
  if (!task.dueDate || task.status === 'done') return false
  return new Date(task.dueDate).getTime() < Date.now()
}

interface TaskCardProps {
  task: Task
  onComplete: (task: Task) => void
  onDelete: (task: Task) => void
}

function TaskCard({ task, onComplete, onDelete }: TaskCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const ps = PRIORITY_STYLES[task.priority]
  const isDone = task.status === 'done'
  const overdue = isOverdue(task)
  return (
    <div
      draggable
      onDragStart={e => e.dataTransfer.setData('text/plain', task._id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: 'var(--card)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', position: 'relative',
        boxShadow: isHovered ? 'var(--shadow)' : 'none',
        padding: '10px 12px', cursor: 'grab',
        transition: 'box-shadow 150ms ease',
      }}
    >
      {isHovered && (
        <button
          onClick={() => onDelete(task)}
          aria-label="Delete task"
          style={{
            position: 'absolute', top: 6, right: 6, width: 20, height: 20,
            border: 'none', background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-secondary)', padding: 0,
          }}
        >
          <X size={12} />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
        <button
          onClick={() => onComplete(task)}
          disabled={isDone}
          aria-label="Mark task done"
          style={{
            width: 16, height: 16, minWidth: 16, borderRadius: '50%', marginTop: 1,
            border: isDone ? '1px solid #059669' : '1px solid var(--border)',
            background: isDone ? '#059669' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: isDone ? 'default' : 'pointer', padding: 0,
          }}
        >
          {isDone && <Check size={10} color="#FFFFFF" />}
        </button>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', letterSpacing: '-0.01em',
          textDecoration: isDone ? 'line-through' : 'none', opacity: isDone ? 0.6 : 1,
        }}>
          {task.title}
        </div>
      </div>
      {task.contactName && (
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, marginLeft: 24 }}>
          {task.contactName}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: 24 }}>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: '2px 7px',
          borderRadius: 'var(--radius-sm)', background: ps.bg, color: ps.color,
        }}>
          {ps.label}
        </span>
        {task.dueDate && (
          <span style={{ fontSize: 11, color: overdue ? '#DC2626' : 'var(--text-tertiary)', fontWeight: overdue ? 600 : 400 }}>
            Due {formatDueDate(task.dueDate)}{overdue ? ' · Overdue' : ''}
          </span>
        )}
      </div>
    </div>
  )
}

interface KanbanColumnProps {
  col: ColumnDef
  tasks: Task[]
  onDropTask: (taskId: string, status: TaskStatus) => void
  onAddTask: (status: TaskStatus) => void
  onComplete: (task: Task) => void
  onDelete: (task: Task) => void
}

function KanbanColumn({ col, tasks, onDropTask, onAddTask, onComplete, onDelete }: KanbanColumnProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) onDropTask(taskId, col.id)
  }
  return (
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      style={{
        minWidth: 230, maxWidth: 230, display: 'flex', flexDirection: 'column',
        borderRadius: 'var(--radius)', padding: 4,
        background: isDragOver ? 'var(--accent-subtle)' : 'transparent',
        border: isDragOver ? '1px dashed var(--text-tertiary)' : '1px dashed transparent',
        transition: 'background 150ms ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, padding: '0 2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{col.label}</span>
          <span style={{
            fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)',
            background: 'var(--accent-subtle)', borderRadius: 'var(--radius-sm)', padding: '1px 6px',
          }}>{tasks.length}</span>
        </div>
        <button
          onClick={() => onAddTask(col.id)}
          aria-label={`Add task to ${col.label}`}
          style={{
            width: 24, height: 24, borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)', background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text-tertiary)',
          }}
        >
          <Plus size={13} />
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 'calc(100vh - 230px)', minHeight: 60 }}>
        {tasks.map(t => (
          <TaskCard key={t._id} task={t} onComplete={onComplete} onDelete={onDelete} />
        ))}
        {tasks.length === 0 && (
          <div style={{
            border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
            padding: '24px 12px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 12,
          }}>No tasks</div>
        )}
      </div>
    </div>
  )
}

interface AddTaskModalProps {
  initialStatus: TaskStatus
  onClose: () => void
  onCreated: (task: Task) => void
  onError: (message: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', padding: '7px 10px',
  border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
  fontSize: 13, color: 'var(--text-primary)', background: 'var(--card)', outline: 'none',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: 4,
}

function AddTaskModal({ initialStatus, onClose, onCreated, onError }: AddTaskModalProps) {
  const [title, setTitle] = useState('')
  const [contactName, setContactName] = useState('')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [status, setStatus] = useState<TaskStatus>(initialStatus)
  const [dueDate, setDueDate] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) {
      setTitleError('Title is required')
      return
    }
    setIsSubmitting(true)
    try {
      const created = await requestJson<Task>('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          contactName: contactName.trim() || undefined,
          priority,
          status,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          workspaceId: WORKSPACE_ID,
        }),
      })
      onCreated(created)
    } catch {
      setIsSubmitting(false)
      onError('Failed to create task. Please try again.')
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(26,23,20,0.3)', zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, background: 'var(--card)', borderRadius: 'var(--radius)',
          border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Add Task</h2>
          <button onClick={onClose} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-tertiary)', padding: 2 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Title *</label>
          <input
            value={title}
            onChange={e => { setTitle(e.target.value); setTitleError(null) }}
            placeholder="Task title"
            style={{ ...inputStyle, borderColor: titleError ? '#DC2626' : 'var(--border)' }}
          />
          {titleError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>{titleError}</div>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>Contact name</label>
          <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Optional" style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Priority</label>
            <select value={priority} onChange={e => setPriority(e.target.value as TaskPriority)} style={inputStyle}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as TaskStatus)} style={inputStyle}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Due date</label>
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{
              padding: '7px 14px', fontSize: 13, borderRadius: 'var(--radius)',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-secondary)', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            style={{
              padding: '7px 14px', fontSize: 13, fontWeight: 500, borderRadius: 'var(--radius)',
              border: 'none', background: 'var(--accent)', color: '#FFFFFF',
              cursor: isSubmitting ? 'wait' : 'pointer', opacity: isSubmitting ? 0.7 : 1,
            }}
          >
            {isSubmitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label, onClick }: { label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        border: '1px solid var(--border)', background: 'transparent',
        borderRadius: 'var(--radius)', padding: '5px 10px',
        fontSize: 12, color: 'var(--text-secondary)', cursor: 'pointer', whiteSpace: 'nowrap',
      }}
    >
      {label} <ChevronDown size={12} />
    </button>
  )
}

function Toast({ message }: { message: string }) {
  return (
    <div style={{
      position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--text-primary)', color: '#FFFFFF', fontSize: 13,
      padding: '9px 16px', borderRadius: 999, boxShadow: 'var(--shadow)', zIndex: 100,
    }}>
      {message}
    </div>
  )
}

export function TasksView() {
  const [activeTab, setActiveTab] = useState('kanban')
  const [tasks, setTasks] = useState<Task[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [modalStatus, setModalStatus] = useState<TaskStatus | null>(null)
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all')

  const showToast = useCallback((message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), TOAST_DURATION_MS)
  }, [])

  useEffect(() => {
    let isCancelled = false
    requestJson<Task[]>(`/api/tasks?workspaceId=${WORKSPACE_ID}`)
      .then(data => { if (!isCancelled) setTasks(data) })
      .catch(() => { if (!isCancelled) setLoadError('Failed to load tasks.') })
      .finally(() => { if (!isCancelled) setIsLoading(false) })
    return () => { isCancelled = true }
  }, [])

  const patchStatus = useCallback((task: Task, status: TaskStatus) => {
    const previous = tasks
    setTasks(prev => prev.map(t => (t._id === task._id ? { ...t, status } : t)))
    fetch(`/api/tasks/${task._id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(res => { if (!res.ok) throw new Error(`Status ${res.status}`) })
      .catch(() => {
        setTasks(previous)
        showToast('Failed to update task.')
      })
  }, [tasks, showToast])

  const handleDropTask = useCallback((taskId: string, status: TaskStatus) => {
    const task = tasks.find(t => t._id === taskId)
    if (!task || task.status === status) return
    patchStatus(task, status)
  }, [tasks, patchStatus])

  const handleComplete = useCallback((task: Task) => {
    if (task.status !== 'done') patchStatus(task, 'done')
  }, [patchStatus])

  const handleDelete = useCallback((task: Task) => {
    const previous = tasks
    setTasks(prev => prev.filter(t => t._id !== task._id))
    fetch(`/api/tasks/${task._id}`, { method: 'DELETE' })
      .then(res => { if (!res.ok) throw new Error(`Status ${res.status}`) })
      .catch(() => {
        setTasks(previous)
        showToast('Failed to delete task.')
      })
  }, [tasks, showToast])

  const handleCreated = useCallback((task: Task) => {
    setTasks(prev => [...prev, task])
    setModalStatus(null)
  }, [])

  const cyclePriorityFilter = useCallback(() => {
    setPriorityFilter(prev => PRIORITY_CYCLE[(PRIORITY_CYCLE.indexOf(prev) + 1) % PRIORITY_CYCLE.length])
  }, [])

  const visibleTasks = priorityFilter === 'all' ? tasks : tasks.filter(t => t.priority === priorityFilter)

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg)', minHeight: '100vh' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.02em', margin: 0 }}>Tasks</h1>
        <button
          onClick={() => setModalStatus('todo')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent)', color: '#FFFFFF',
            border: 'none', borderRadius: 'var(--radius)', padding: '7px 14px',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Add Task
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 2, background: 'var(--accent-subtle)', borderRadius: 'var(--radius)', padding: 3 }}>
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 8, border: 'none',
                background: activeTab === id ? 'var(--card)' : 'transparent',
                color: activeTab === id ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterChip label={PRIORITY_FILTER_LABELS[priorityFilter]} onClick={cyclePriorityFilter} />
          {STATIC_FILTERS.map(f => <FilterChip key={f} label={f} />)}
        </div>
      </div>

      {isLoading && <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading tasks…</div>}
      {loadError && <div style={{ fontSize: 13, color: '#DC2626' }}>{loadError}</div>}

      {!isLoading && !loadError && activeTab === 'kanban' && (
        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16, alignItems: 'flex-start' }}>
          {COLUMNS.map(col => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={visibleTasks.filter(t => t.status === col.id)}
              onDropTask={handleDropTask}
              onAddTask={setModalStatus}
              onComplete={handleComplete}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {!isLoading && !loadError && activeTab !== 'kanban' && (
        <div style={{
          border: '1px dashed var(--border)', borderRadius: 'var(--radius)',
          padding: '48px 24px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13,
        }}>
          This view is coming soon. Switch to Kanban to manage tasks.
        </div>
      )}

      {modalStatus && (
        <AddTaskModal
          initialStatus={modalStatus}
          onClose={() => setModalStatus(null)}
          onCreated={handleCreated}
          onError={showToast}
        />
      )}
      {toast && <Toast message={toast} />}
    </div>
  )
}
