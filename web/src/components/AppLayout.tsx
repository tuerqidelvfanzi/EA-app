import { NavLink, Outlet } from 'react-router-dom';
import { Package, LogOut } from 'lucide-react';
import { PRODUCT_NAME } from '../lib/brand';
import { v3NavGroups, type NavGroup } from '../v2/nav';
import { isDemoMode, demoNavGroups } from '../lib/demoConfig';
import { useAuth } from '../lib/auth';
import { Button } from './ui';
import { SettingsSectionBoundary } from './SettingsSectionBoundary';

function NavGroupSection({ group }: { group: NavGroup }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-[var(--color-text-muted)] tracking-wider">
        <span className="text-base">{group.icon}</span>
        <span>{group.title}</span>
      </div>
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--color-primary-soft)] font-semibold text-[var(--color-nav-accent,var(--color-primary))] shadow-sm'
                  : 'text-[var(--color-text-label)] hover:bg-[var(--color-muted)] hover:text-[var(--color-text)]'
              }`
            }
          >
            <span className="text-base">{item.icon || '📄'}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] text-white">
                {item.badge}
              </span>
            ) : null}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

export function AppLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <aside className="flex w-60 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
        {/* 顶栏 */}
        <div
          className="flex items-center gap-2.5 border-b border-[var(--color-border)] px-5 py-5"
          style={{
            background: 'var(--color-topbar)',
            color: 'var(--color-topbar-fg)',
          }}
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--color-primary)] text-white">
            <Package className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight">{PRODUCT_NAME}</span>
            <span className="text-xs opacity-60">电商运营助手</span>
          </div>
          <span className="ml-auto rounded-md bg-[var(--color-primary)] px-1.5 py-0.5 text-[10px] text-white font-medium">v3.0</span>
        </div>

        {/* 分组导航 */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {(isDemoMode() ? demoNavGroups : v3NavGroups).map((group) => (
            <NavGroupSection key={group.title} group={group} />
          ))}
        </nav>

        {/* 底部 */}
        <div className="border-t border-[var(--color-border)] p-3">
          <Button variant="ghost" className="w-full justify-start gap-2" onClick={logout}>
            <LogOut className="h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {isDemoMode() && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center text-xs py-1.5 font-medium tracking-wide">
            ✨ 演示模式 &mdash; 精简功能版本 | 全功能版本
          </div>
        )}
        <div className="p-6">
        <SettingsSectionBoundary title="页面内容">
          <Outlet />
        </SettingsSectionBoundary>
        </div>
      </main>
    </div>
  );
}
