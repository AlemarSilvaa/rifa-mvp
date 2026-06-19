import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'
import { createServerSupabase } from '@/lib/supabase-server'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = headers().get('x-pathname') || ''
  const isLoginPage = pathname === '/admin/login'

  const supabase = createServerSupabase()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user && !isLoginPage) redirect('/admin/login')

  // Página de login: renderiza sem sidebar
  if (isLoginPage) return <>{children}</>

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col min-h-screen">
        <div className="p-4 border-b border-gray-700">
          <p className="font-bold text-green-400">🎟️ Rifa Admin</p>
          <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1 text-sm">
          {[
            { href: '/admin', label: '📊 Dashboard' },
            { href: '/admin/rifas', label: '🎫 Rifas' },
            { href: '/admin/pedidos', label: '📋 Pedidos' },
            { href: '/admin/vendas/nova', label: '💵 Venda em dinheiro' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="block px-3 py-2 rounded-lg hover:bg-gray-800 text-gray-300 hover:text-white transition-colors">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-gray-700">
          <form action="/api/auth/signout" method="post">
            <button className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors">
              🚪 Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
