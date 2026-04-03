/* @arkzen:meta
name: client-portal
version: 2.0.0
description: Complete client portal with projects, tasks, invoices, and real-time updates
auth: false
dependencies: []
*/

/* @arkzen:config
modal:
  borderRadius: 2xl
  backdrop: blur
  animation: fadeScale
toast:
  position: top-right
  duration: 3000
table:
  striped: true
  hoverable: true
*/

/* @arkzen:database:projects
table: projects
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  name:
    type: string
    length: 255
    nullable: false
  description:
    type: text
    nullable: true
  status:
    type: string
    length: 50
    default: active
    nullable: false
  progress:
    type: integer
    default: 0
    nullable: false
  start_date:
    type: date
    nullable: true
  end_date:
    type: date
    nullable: true
  client_id:
    type: integer
    nullable: true
seeder:
  count: 3
  data:
    - name: Website Redesign
      description: Complete website overhaul with new design system
      status: active
      progress: 65
    - name: Mobile App Development
      description: iOS and Android mobile application
      status: active
      progress: 30
    - name: CRM Integration
      description: Connect existing systems with new CRM
      status: planning
      progress: 10
*/

/* @arkzen:database:tasks
table: tasks
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  project_id:
    type: integer
    foreign: projects.id
    onDelete: cascade
    nullable: false
  title:
    type: string
    length: 255
    nullable: false
  description:
    type: text
    nullable: true
  status:
    type: string
    length: 50
    default: todo
    nullable: false
  priority:
    type: string
    length: 20
    default: medium
    nullable: false
  due_date:
    type: date
    nullable: true
  completed_at:
    type: datetime
    nullable: true
*/

/* @arkzen:database:invoices
table: invoices
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  project_id:
    type: integer
    foreign: projects.id
    onDelete: cascade
    nullable: false
  invoice_number:
    type: string
    length: 100
    unique: true
    nullable: false
  amount:
    type: decimal
    precision: 10
    scale: 2
    nullable: false
  status:
    type: string
    length: 50
    default: pending
    nullable: false
  due_date:
    type: date
    nullable: false
  paid_at:
    type: datetime
    nullable: true
seeder:
  data:
    - invoice_number: INV-2024-001
      amount: 5000.00
      status: paid
      project_id: 1
      due_date: 2024-12-31
    - invoice_number: INV-2024-002
      amount: 3500.00
      status: pending
      project_id: 1
      due_date: 2024-12-31
    - invoice_number: INV-2024-003
      amount: 12000.00
      status: overdue
      project_id: 2
      due_date: 2024-11-30
*/

/* @arkzen:database:comments
table: comments
timestamps: true
softDeletes: false
columns:
  id:
    type: integer
    primary: true
    autoIncrement: true
  task_id:
    type: integer
    foreign: tasks.id
    onDelete: cascade
    nullable: false
  user_id:
    type: integer
    nullable: true
  content:
    type: text
    nullable: false
*/

/* @arkzen:api:projects
model: Project
controller: ProjectController
prefix: /api/projects
middleware: []
resource: true
policy: false
factory: true
endpoints:
  index:
    method: GET
    route: /
    description: Get paginated projects
    query:
      search: string|optional
      status: string|optional
      per_page: integer|default:15
    response:
      type: paginated
  show:
    method: GET
    route: /{id}
    description: Get single project with tasks
    response:
      type: single
  store:
    method: POST
    route: /
    description: Create new project
    validation:
      name: required|string|max:255
      description: nullable|string
      status: required|in:active,planning,completed,on_hold
      start_date: nullable|date
      end_date: nullable|date|after:start_date
    response:
      type: single
  update:
    method: PUT
    route: /{id}
    description: Update project
    validation:
      name: sometimes|string|max:255
      status: sometimes|in:active,planning,completed,on_hold
      progress: sometimes|integer|min:0|max:100
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete project
    response:
      type: message
      value: Project deleted successfully
*/

/* @arkzen:api:tasks
model: Task
controller: TaskController
prefix: /api/tasks
middleware: []
resource: true
policy: false
endpoints:
  index:
    method: GET
    route: /
    description: Get tasks by project
    query:
      project_id: required|integer
    response:
      type: collection
  show:
    method: GET
    route: /{id}
    description: Get single task
    response:
      type: single
  store:
    method: POST
    route: /
    description: Create new task
    validation:
      project_id: required|exists:projects,id
      title: required|string|max:255
      description: nullable|string
      priority: required|in:low,medium,high,urgent
      due_date: nullable|date
    response:
      type: single
  update:
    method: PUT
    route: /{id}
    description: Update task
    validation:
      title: sometimes|string|max:255
      status: sometimes|in:todo,in_progress,review,done
      completed_at: nullable|date
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete task
    response:
      type: message
      value: Task deleted successfully
*/

/* @arkzen:api:invoices
model: Invoice
controller: InvoiceController
prefix: /api/invoices
middleware: []
resource: true
policy: false
endpoints:
  index:
    method: GET
    route: /
    description: Get paginated invoices
    query:
      status: string|optional
      per_page: integer|default:15
    response:
      type: paginated
  show:
    method: GET
    route: /{id}
    description: Get single invoice
    response:
      type: single
*/

/* @arkzen:api:comments
model: Comment
controller: CommentController
prefix: /api/comments
middleware: []
endpoints:
  index:
    method: GET
    route: /
    description: Get comments by task
    query:
      task_id: required|integer
    response:
      type: collection
  store:
    method: POST
    route: /
    description: Create comment
    validation:
      task_id: required|exists:tasks,id
      content: required|string
    response:
      type: single
  destroy:
    method: DELETE
    route: /{id}
    description: Delete comment
    response:
      type: message
      value: Comment deleted
*/

/* @arkzen:components:shared */

'use client'

import React, { useState } from 'react'
import {
  LayoutDashboard, FolderKanban, CheckSquare, FileText,
  Plus, Edit2, Trash2, Calendar, Briefcase,
  CheckCircle, TrendingUp, DollarSign
} from 'lucide-react'
import { Modal }      from '@/arkzen/core/components/Modal'
import { Dialog }     from '@/arkzen/core/components/Dialog'
import { Badge }      from '@/arkzen/core/components/utils'
import { useToast }   from '@/arkzen/core/components/Toast'
import { useQuery }   from '@/arkzen/core/hooks/useQuery'
import { useMutation } from '@/arkzen/core/hooks/useMutation'

interface Project {
  id: number
  name: string
  description: string | null
  status: 'active' | 'planning' | 'completed' | 'on_hold'
  progress: number
  start_date: string | null
  end_date: string | null
  created_at: string
}

interface Task {
  id: number
  project_id: number
  title: string
  description: string | null
  status: 'todo' | 'in_progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  completed_at: string | null
}

interface Invoice {
  id: number
  project_id: number
  invoice_number: string
  amount: number
  status: 'paid' | 'pending' | 'overdue'
  due_date: string
  paid_at: string | null
  project?: Project
}

/* @arkzen:components:shared:end */

/* @arkzen:components:ui */

'use client'

import React from 'react'

const statusBadgeMap = {
  project: {
    active:    { label: 'Active',    cls: 'bg-emerald-100 text-emerald-700' },
    planning:  { label: 'Planning',  cls: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Completed', cls: 'bg-neutral-100 text-neutral-700' },
    on_hold:   { label: 'On Hold',   cls: 'bg-amber-100 text-amber-700' },
  },
  task: {
    todo:        { label: 'To Do',       cls: 'bg-neutral-100 text-neutral-700' },
    in_progress: { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' },
    review:      { label: 'Review',      cls: 'bg-purple-100 text-purple-700' },
    done:        { label: 'Done',        cls: 'bg-emerald-100 text-emerald-700' },
  },
  priority: {
    low:    { label: 'Low',    cls: 'bg-neutral-100 text-neutral-600' },
    medium: { label: 'Medium', cls: 'bg-blue-100 text-blue-700' },
    high:   { label: 'High',   cls: 'bg-orange-100 text-orange-700' },
    urgent: { label: 'Urgent', cls: 'bg-red-100 text-red-700' },
  },
  invoice: {
    paid:    { label: 'Paid',    cls: 'bg-emerald-100 text-emerald-700' },
    pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
    overdue: { label: 'Overdue', cls: 'bg-red-100 text-red-700' },
  },
}

const StatusChip = ({ map, value }: { map: Record<string, { label: string; cls: string }>; value: string }) => {
  const cfg = map[value] ?? { label: value, cls: 'bg-neutral-100 text-neutral-600' }
  return <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
}

const StatCard = ({ label, value, icon, color }: {
  label: string; value: string | number; icon: React.ReactNode; color: string
}) => (
  <div className="arkzen-card p-5 flex items-center gap-4">
    <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
    <div>
      <p className="text-xs text-neutral-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-neutral-900">{value}</p>
    </div>
  </div>
)

const ProjectCard = ({ project, onView, onEdit, onDelete }: {
  project: Project; onView: () => void; onEdit: () => void; onDelete: () => void
}) => (
  <div className="group arkzen-card p-5 hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={onView}>
    <div className="flex items-start justify-between mb-3">
      <h3 className="font-semibold text-neutral-900">{project.name}</h3>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={e => { e.stopPropagation(); onEdit() }} className="p-1.5 rounded-lg hover:bg-neutral-100"><Edit2 size={14} /></button>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={14} className="text-red-500" /></button>
      </div>
    </div>
    {project.description && <p className="text-sm text-neutral-500 mb-4 line-clamp-2">{project.description}</p>}
    <div className="flex items-center justify-between mb-3">
      <StatusChip map={statusBadgeMap.project} value={project.status} />
      <span className="text-xs text-neutral-400">{project.progress}%</span>
    </div>
    <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
      <div className="h-full bg-violet-600 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
    </div>
  </div>
)

const TaskItem = ({ task, onToggle, onEdit, onDelete }: {
  task: Task; onToggle: () => void; onEdit: () => void; onDelete: () => void
}) => (
  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-50 transition-colors group">
    <button onClick={onToggle} className="flex-shrink-0">
      {task.status === 'done'
        ? <CheckCircle size={18} className="text-emerald-500" />
        : <div className="w-4 h-4 rounded-full border-2 border-neutral-300 group-hover:border-violet-400 transition-colors" />
      }
    </button>
    <div className="flex-1 min-w-0">
      <p className={`text-sm ${task.status === 'done' ? 'line-through text-neutral-400' : 'text-neutral-700'}`}>{task.title}</p>
      <div className="flex items-center gap-2 mt-1">
        <StatusChip map={statusBadgeMap.priority} value={task.priority} />
        {task.due_date && (
          <span className="text-xs text-neutral-400 flex items-center gap-1">
            <Calendar size={10} /> Due {new Date(task.due_date).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-neutral-100"><Edit2 size={12} /></button>
      <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50"><Trash2 size={12} className="text-red-500" /></button>
    </div>
  </div>
)

/* @arkzen:components:ui:end */

/* @arkzen:page:index */
/* @arkzen:page:layout:auth */
const IndexPage = () => {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'dashboard' | 'projects' | 'tasks' | 'invoices'>('dashboard')
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projectModalOpen, setProjectModalOpen] = useState(false)
  const [taskModalOpen, setTaskModalOpen]       = useState(false)
  const [editingProject, setEditingProject]     = useState<Project | null>(null)
  const [editingTask, setEditingTask]           = useState<Task | null>(null)
  const [deleteDialog, setDeleteDialog]         = useState<{ type: 'project' | 'task'; id: number; name: string } | null>(null)
  const [projectForm, setProjectForm]           = useState({ name: '', description: '', status: 'active' as const, start_date: '', end_date: '' })
  const [taskForm, setTaskForm]                 = useState({ title: '', description: '', priority: 'medium' as const, due_date: '' })

  const { data: projectsData, refetch: refetchProjects } = useQuery<{ data: Project[] }>('/api/projects', { params: { per_page: 50 } })
  const { data: tasksData,    refetch: refetchTasks }    = useQuery<{ data: Task[] }>('/api/tasks', { params: { project_id: selectedProject?.id || 0 }, enabled: !!selectedProject })
  const { data: invoicesData }                           = useQuery<{ data: Invoice[] }>('/api/invoices', { params: { per_page: 20 } })

  const projects = projectsData?.data || []
  const tasks    = tasksData?.data    || []
  const invoices = invoicesData?.data || []

  const { mutate: createProject } = useMutation({ method: 'POST', invalidates: ['/api/projects'], onSuccess: () => { toast.success('Project created'); setProjectModalOpen(false); refetchProjects() }, onError: () => toast.error('Failed') })
  const { mutate: updateProject } = useMutation({ method: 'PUT',  invalidates: ['/api/projects'], onSuccess: () => { toast.success('Project updated'); setProjectModalOpen(false); refetchProjects() }, onError: () => toast.error('Failed') })
  const { mutate: deleteProject } = useMutation({ method: 'DELETE', invalidates: ['/api/projects'], onSuccess: () => { toast.success('Project deleted'); refetchProjects() } })
  const { mutate: createTask }    = useMutation({ method: 'POST', invalidates: ['/api/tasks'], onSuccess: () => { toast.success('Task created'); setTaskModalOpen(false); refetchTasks() } })
  const { mutate: updateTask }    = useMutation({ method: 'PUT',  invalidates: ['/api/tasks'], onSuccess: () => { toast.success('Task updated'); setTaskModalOpen(false); refetchTasks() } })
  const { mutate: deleteTask }    = useMutation({ method: 'DELETE', invalidates: ['/api/tasks'], onSuccess: () => { toast.success('Task deleted'); refetchTasks() } })
  const { mutate: toggleTask }    = useMutation({ method: 'PUT',  invalidates: ['/api/tasks'], onSuccess: () => refetchTasks() })

  const stats = {
    activeProjects:  projects.filter(p => p.status === 'active').length,
    completedTasks:  tasks.filter(t => t.status === 'done').length,
    pendingInvoices: invoices.filter(i => i.status === 'pending').length,
    totalRevenue:    invoices.reduce((s, i) => s + i.amount, 0),
  }

  const openNewProject = () => { setEditingProject(null); setProjectForm({ name: '', description: '', status: 'active', start_date: '', end_date: '' }); setProjectModalOpen(true) }
  const openEditProject = (p: Project) => { setEditingProject(p); setProjectForm({ name: p.name, description: p.description || '', status: p.status, start_date: p.start_date || '', end_date: p.end_date || '' }); setProjectModalOpen(true) }

  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'projects'  as const, label: 'Projects',  icon: <FolderKanban size={15} /> },
    { id: 'tasks'     as const, label: 'Tasks',     icon: <CheckSquare size={15} /> },
    { id: 'invoices'  as const, label: 'Invoices',  icon: <FileText size={15} /> },
  ]

  return (
    <div className="arkzen-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">Client Portal</h1>
          <p className="text-neutral-500 mt-1">Manage your projects, tasks, and invoices</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-100 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === tab.id ? 'text-violet-600 border-b-2 border-violet-600' : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard */}
      {activeTab === 'dashboard' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Active Projects"  value={stats.activeProjects}                          icon={<Briefcase size={20} />}    color="bg-blue-50 text-blue-600" />
            <StatCard label="Completed Tasks"  value={stats.completedTasks}                          icon={<CheckCircle size={20} />}  color="bg-emerald-50 text-emerald-600" />
            <StatCard label="Pending Invoices" value={stats.pendingInvoices}                         icon={<DollarSign size={20} />}   color="bg-amber-50 text-amber-600" />
            <StatCard label="Total Revenue"    value={`₱${stats.totalRevenue.toLocaleString()}`}    icon={<TrendingUp size={20} />}   color="bg-violet-50 text-violet-600" />
          </div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recent Projects</h2>
            <button onClick={openNewProject} className="arkzen-btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> New Project</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map(p => (
              <ProjectCard key={p.id} project={p}
                onView={() => { setSelectedProject(p); setActiveTab('tasks') }}
                onEdit={() => openEditProject(p)}
                onDelete={() => setDeleteDialog({ type: 'project', id: p.id, name: p.name })}
              />
            ))}
          </div>
        </>
      )}

      {/* Projects */}
      {activeTab === 'projects' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">All Projects</h2>
            <button onClick={openNewProject} className="arkzen-btn-primary text-sm px-3 py-1.5 flex items-center gap-1"><Plus size={14} /> New Project</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p}
                onView={() => { setSelectedProject(p); setActiveTab('tasks') }}
                onEdit={() => openEditProject(p)}
                onDelete={() => setDeleteDialog({ type: 'project', id: p.id, name: p.name })}
              />
            ))}
          </div>
        </>
      )}

      {/* Tasks */}
      {activeTab === 'tasks' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">{selectedProject ? `Tasks: ${selectedProject.name}` : 'Select a Project'}</h2>
            {selectedProject && (
              <button onClick={() => { setEditingTask(null); setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' }); setTaskModalOpen(true) }} className="arkzen-btn-primary text-sm px-3 py-1.5 flex items-center gap-1">
                <Plus size={14} /> New Task
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setSelectedProject(null)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${!selectedProject ? 'bg-violet-100 text-violet-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'}`}>All</button>
            {projects.map(p => (
              <button key={p.id} onClick={() => setSelectedProject(p)} className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${selectedProject?.id === p.id ? 'bg-violet-100 text-violet-700' : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-600'}`}>{p.name}</button>
            ))}
          </div>
          {!selectedProject
            ? <p className="text-center py-12 text-neutral-400">Select a project to view tasks</p>
            : tasks.length === 0
              ? <p className="text-center py-12 text-neutral-400">No tasks yet. Create your first task!</p>
              : <div className="space-y-1">{tasks.map(t => (
                  <TaskItem key={t.id} task={t}
                    onToggle={() => toggleTask(`/api/tasks/${t.id}`, { status: t.status === 'done' ? 'todo' : 'done', completed_at: t.status === 'done' ? null : new Date().toISOString() })}
                    onEdit={() => { setEditingTask(t); setTaskForm({ title: t.title, description: t.description || '', priority: t.priority, due_date: t.due_date || '' }); setTaskModalOpen(true) }}
                    onDelete={() => setDeleteDialog({ type: 'task', id: t.id, name: t.title })}
                  />
                ))}</div>
          }
        </>
      )}

      {/* Invoices */}
      {activeTab === 'invoices' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                {['Invoice #', 'Project', 'Amount', 'Due Date', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-neutral-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id} className="border-b border-neutral-100 hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3.5 font-mono text-xs">{inv.invoice_number}</td>
                  <td className="px-4 py-3.5">{inv.project?.name || '-'}</td>
                  <td className="px-4 py-3.5 font-semibold">₱{inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-neutral-500">{new Date(inv.due_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5"><StatusChip map={statusBadgeMap.invoice} value={inv.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Modal */}
      <Modal open={projectModalOpen} onClose={() => setProjectModalOpen(false)} title={editingProject ? 'Edit Project' : 'New Project'} size="lg"
        renderFooter={(onClose) => (
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="arkzen-btn-secondary">Cancel</button>
            <button onClick={() => editingProject ? updateProject(`/api/projects/${editingProject.id}`, projectForm) : createProject('/api/projects', projectForm)} className="arkzen-btn-primary">
              {editingProject ? 'Update' : 'Create'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Project Name *</label>
            <input className="arkzen-input w-full" value={projectForm.name} onChange={e => setProjectForm({ ...projectForm, name: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea className="arkzen-input w-full" rows={3} value={projectForm.description} onChange={e => setProjectForm({ ...projectForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select className="arkzen-input w-full" value={projectForm.status} onChange={e => setProjectForm({ ...projectForm, status: e.target.value as Project['status'] })}>
                <option value="active">Active</option>
                <option value="planning">Planning</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Start Date</label>
              <input type="date" className="arkzen-input w-full" value={projectForm.start_date} onChange={e => setProjectForm({ ...projectForm, start_date: e.target.value })} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">End Date</label>
              <input type="date" className="arkzen-input w-full" value={projectForm.end_date} onChange={e => setProjectForm({ ...projectForm, end_date: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal open={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={editingTask ? 'Edit Task' : 'New Task'} size="md"
        renderFooter={(onClose) => (
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="arkzen-btn-secondary">Cancel</button>
            <button onClick={() => {
              if (!selectedProject) return
              editingTask
                ? updateTask(`/api/tasks/${editingTask.id}`, { ...taskForm, project_id: selectedProject.id })
                : createTask('/api/tasks', { ...taskForm, project_id: selectedProject.id })
            }} className="arkzen-btn-primary">
              {editingTask ? 'Update' : 'Create'}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Title *</label>
            <input className="arkzen-input w-full" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Description</label>
            <textarea className="arkzen-input w-full" rows={3} value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Priority</label>
              <select className="arkzen-input w-full" value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value as Task['priority'] })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Due Date</label>
              <input type="date" className="arkzen-input w-full" value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            </div>
          </div>
        </div>
      </Modal>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteDialog}
        onConfirm={() => {
          if (deleteDialog?.type === 'project') deleteProject(`/api/projects/${deleteDialog.id}`, {})
          if (deleteDialog?.type === 'task')    deleteTask(`/api/tasks/${deleteDialog.id}`, {})
          setDeleteDialog(null)
        }}
        onCancel={() => setDeleteDialog(null)}
        title="Delete Item"
        description={`Are you sure you want to delete "${deleteDialog?.name}"? This action cannot be undone.`}
        variant="danger"
      />
    </div>
  )
}
/* @arkzen:page:index:end */

/* @arkzen:animation */

import { gsap } from 'gsap'
import React from 'react'

const clientPortalAnimations = (pageRef: React.RefObject<HTMLDivElement>) => {
  const ctx = gsap.context(() => {
    gsap.fromTo('.arkzen-card',
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out' }
    )
  }, pageRef)
  return () => ctx.revert()
}

export const pageVariants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  exit:    { opacity: 0, y: -8, transition: { duration: 0.25 } },
}

/* @arkzen:animation:end */
