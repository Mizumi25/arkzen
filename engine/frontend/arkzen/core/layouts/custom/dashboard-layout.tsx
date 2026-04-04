'use client'
// ARKZEN CUSTOM LAYOUT — dashboard-layout
// Generated from tatemono: project-hub

export const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname()
  const { user, logout } = useAuthStore()
  const { sidebarOpen, toggleSidebar, theme, toggleTheme } = useUIStore()

  const navItems = [
    { href: '/project-hub', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { href: '/project-hub/projects', label: 'Projects', icon: <FolderKanban size={18} /> },
    { href: '/project-hub/tasks', label: 'Tasks', icon: <CheckSquare size={18} /> },
    { href: '/project-hub/team', label: 'Team', icon: <Users size={18} /> },
    { href: '/project-hub/settings', label: 'Settings', icon: <Settings size={18} /> },
  ]

  return (
    <div className={`flex h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <aside className={`fixed md:relative z-50 flex flex-col h-full bg-neutral-900 border-r border-neutral-800 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-0 md:w-20 overflow-hidden'}`}>
        <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-800">
          <div className={`flex items-center gap-2 ${!sidebarOpen && 'md:justify-center md:w-full'}`}>
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">PH</span>
            </div>
            {sidebarOpen && <span className="font-semibold text-white">Project Hub</span>}
          </div>
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white md:block hidden">
            <Menu size={16} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                pathname === item.href
                  ? 'bg-violet-600 text-white'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              } ${!sidebarOpen && 'md:justify-center'}`}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-neutral-800 space-y-2">
          <button
            onClick={toggleTheme}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors ${!sidebarOpen && 'md:justify-center'}`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            {sidebarOpen && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>
          <button
            onClick={logout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm text-neutral-400 hover:text-red-400 hover:bg-red-500/10 transition-colors ${!sidebarOpen && 'md:justify-center'}`}
          >
            <LogOut size={18} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={toggleSidebar} />
      )}

      <div className="flex-1 flex flex-col overflow-hidden bg-neutral-950">
        <header className="h-16 flex items-center justify-between px-6 bg-neutral-900/50 border-b border-neutral-800 backdrop-blur-sm">
          <button onClick={toggleSidebar} className="p-2 rounded-lg hover:bg-neutral-800 text-neutral-400 hover:text-white md:hidden">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <Tooltip content="Profile">
              <Avatar size="sm" name={user?.name || 'User'} />
            </Tooltip>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
