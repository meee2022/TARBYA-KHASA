import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import Workspace from './workspace/Workspace';
import { SiteProvider, useSiteConfig, routeAvailable } from './workspace/site';
import { Link } from 'react-router-dom';
import { WorkspaceProvider } from './workspace/store';
const Legacy = lazy(() => import('./LegacyApp'));
export default function App() { return <SiteProvider><Application /></SiteProvider>; }
function Application() {
  const { pathname } = useLocation();
  const { site } = useSiteConfig();
  if (!pathname.startsWith('/admin') && (site.maintenance || !routeAvailable(pathname, site))) return <div className="studio site-unavailable" dir="rtl"><h1>{site.maintenance ? site.brandName : 'هذا القسم غير متاح حاليًا'}</h1><p>{site.maintenance ? site.maintenanceMessage : 'أوقفت الإدارة هذا القسم مؤقتًا. بياناتك المحفوظة باقية.'}</p><Link className="button secondary" to={site.maintenance ? '/admin' : '/'}>{site.maintenance ? 'دخول الإدارة' : 'العودة إلى الرئيسية'}</Link></div>;
  if (/^\/(legacy|categories|generate|play|reports|report|report-class)(\/|$)/.test(pathname)) return <Suspense fallback={<p>جارٍ فتح النسخة السابقة…</p>}><Legacy /></Suspense>;
  return <WorkspaceProvider><Workspace /></WorkspaceProvider>;
}
