import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { defaultSite, SiteConfig, validateSite } from '../../packages/domain/site';
import { api } from '../../convex/_generated/api';
import { convex } from '../convexClient';
const Context=createContext<{site:SiteConfig;refresh:()=>Promise<void>;setSite:(site:SiteConfig)=>void}>({site:defaultSite,refresh:async()=>{},setSite:()=>{}});
export function SiteProvider({children}:{children:ReactNode}){
  const [site,setSite]=useState<SiteConfig>(structuredClone(defaultSite));
  async function refresh(){if(convex)return;try{const response=await fetch('/api/site');if(!response.ok)return;const json=await response.json();setSite(validateSite(json.site));}catch{/* Offline workspace retains the last known settings. */}}
  useEffect(()=>{if(convex){const watch=convex.watchQuery(api.admin.getSite,{});const apply=()=>{try{const json=watch.localQueryResult();if(json)setSite(validateSite(JSON.parse(json)));}catch{/* Keeps the last known settings when offline. */}};apply();return watch.onUpdate(apply);}void refresh();const timer=window.setInterval(refresh,30000);const focus=()=>void refresh();window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);};},[]);
  useEffect(()=>{document.documentElement.style.setProperty('--brand-color',site.primaryColor);document.documentElement.dataset.baseTitle=site.brandName+' — مساحة الدعم الإضافي';if(!document.title.includes(' · '))document.title=document.documentElement.dataset.baseTitle;},[site]);
  return <Context.Provider value={{site,refresh,setSite}}>{children}</Context.Provider>;
}
export const useSiteConfig=()=>useContext(Context);
export function routeAvailable(path:string,site:SiteConfig){
  const first=path.split('/')[1];
  const module=path.startsWith('/session/')?'lessons':path.startsWith('/learn/')?'games':path.startsWith('/support/')?'tools':({categories:'library',generate:'lessons',play:'games',reports:'progress',report:'progress','report-class':'progress'} as Record<string,string>)[first]??first;
  return !(module in site.modules)||site.modules[module as keyof SiteConfig['modules']];
}
