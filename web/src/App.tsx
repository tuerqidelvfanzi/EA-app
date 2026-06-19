import { Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { WorkbenchPage } from './pages/workbench/WorkbenchPage';
import { CompetitorsPage } from './pages/competitors/CompetitorsPage';
import { TitleOptimizationPage } from './pages/workbench/TitleOptimizationPage';
import { InboxPage } from './pages/InboxPage';
import { LinkCollectPage } from './pages/link-collect/LinkCollectPage';
import { BatchCollectPage } from './pages/BatchCollectPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { RewriteTemplatesPage } from './pages/RewriteTemplatesPage';
import { RulesPage } from './pages/RulesPage';
import { InsightsPage } from './pages/InsightsPage';
import { PublishPage } from './pages/PublishPage';
import { SettingsPage } from './pages/SettingsPage';
import { ThemeSettingsV2 } from './lib/ThemeSettingsV2';
import { ThemeMarketplace } from './components/theme/ThemeMarketplace';
import { TitleOptimizerV2 } from './pages/TitleOptimizerV2';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { TeamPage } from './pages/TeamPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { useAuth } from './hooks/useAuth';
import { isDemoMode, DEMO_ROUTES } from './lib/demoConfig';

/**
 * V3.0 完整路由配置
 * 覆盖所有V3需求中的菜单项
 */
export function App() {
  const { isAuthenticated } = useAuth();
  return (
    <Routes>
      {/* 公开路由 */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/app" replace /> : <LoginPage />} />
      <Route path="/register" element={isAuthenticated ? <Navigate to="/app" replace /> : <RegisterPage />} />

      <Route element={<AppLayout />}>
        {/* 首页/工作台 */}
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/app" element={<DashboardPage />} />

        {/* 选品中心 */}
        <Route path="/app/competitors" element={<CompetitorsPage />} />

        {/* 工作台 */}
        <Route path="/app/workbench/:id" element={<WorkbenchPage />} />
        <Route path="/app/title-optimization" element={<TitleOptimizationPage />} />
        <Route path="/app/inbox" element={<InboxPage />} />
        <Route path="/app/link-collect" element={<LinkCollectPage />} />
        <Route path="/app/batch-collect" element={<Navigate to="/app/link-collect" replace />} />

        {/* 配置中心 */}
        <Route path="/app/templates" element={<TemplatesPage />} />
        <Route path="/app/rewrite-templates" element={<RewriteTemplatesPage />} />
        <Route path="/app/rules" element={<RulesPage />} />

        {/* 发布中心 */}
        <Route path="/app/insights" element={<InsightsPage />} />
        <Route path="/app/publish" element={<PublishPage />} />

        {/* 系统设置 */}
        <Route path="/app/settings" element={<SettingsPage />} />
        <Route path="/app/settings/themes" element={<ThemeSettingsV2 />} />
        <Route path="/app/settings/themes/market" element={<ThemeMarketplace />} />
        <Route path="/app/title-optimizer-v2" element={<TitleOptimizerV2 />} />
        <Route path="/app/integrations" element={<IntegrationsPage />} />
        <Route path="/app/team" element={<TeamPage />} />

        {/* 兜底 */}
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
