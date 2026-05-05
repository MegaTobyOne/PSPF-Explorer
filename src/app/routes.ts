import type { RouteSpec } from './router.ts';

export const routes: readonly RouteSpec[] = [
  { path: '/', component: 'pspf-home-view', load: () => import('../views/home-view.ts') },
  {
    path: '/domain/:key',
    component: 'pspf-domain-view',
    load: () => import('../views/domain-view.ts'),
  },
  {
    path: '/requirement/:id',
    component: 'pspf-requirement-view',
    load: () => import('../views/requirement-view.ts'),
  },
  { path: '/risks', component: 'pspf-risks-view', load: () => import('../views/risks-view.ts') },
  {
    path: '/actions',
    component: 'pspf-actions-view',
    load: () => import('../views/actions-view.ts'),
  },
  { path: '/tags', component: 'pspf-tags-view', load: () => import('../views/tags-view.ts') },
  {
    path: '/views',
    component: 'pspf-saved-views-view',
    load: () => import('../views/saved-views-view.ts'),
  },
  {
    path: '/posture',
    component: 'pspf-posture-view',
    load: () => import('../views/posture-view.ts'),
  },
  {
    path: '/analytics',
    component: 'pspf-analytics-view',
    load: () => import('../views/analytics-view.ts'),
  },
  {
    path: '/coverage',
    component: 'pspf-coverage-view',
    load: () => import('../views/coverage-view.ts'),
  },
  {
    path: '/directions',
    component: 'pspf-directions-view',
    load: () => import('../views/directions-view.ts'),
  },
  {
    path: '/relationships',
    component: 'pspf-relationships-view',
    load: () => import('../views/relationships-view.ts'),
  },
  {
    path: '/backup',
    component: 'pspf-backup-view',
    load: () => import('../views/backup-view.ts'),
  },
  {
    path: '/restore',
    component: 'pspf-restore-view',
    load: () => import('../views/restore-view.ts'),
  },
  {
    path: '/integrity',
    component: 'pspf-integrity-view',
    load: () => import('../views/integrity-view.ts'),
  },
  { path: '/help', component: 'pspf-help-view', load: () => import('../views/help-view.ts') },
  {
    path: '(.*)',
    component: 'pspf-not-found-view',
    load: () => import('../views/not-found-view.ts'),
  },
];

export const NAV_ROUTES: readonly { path: string; label: string }[] = [
  { path: '/', label: 'Home' },
  { path: '/risks', label: 'Risks' },
  { path: '/actions', label: 'Actions' },
  { path: '/tags', label: 'Tags' },
  { path: '/views', label: 'Saved views' },
  { path: '/posture', label: 'Posture' },
  { path: '/analytics', label: 'Analytics' },
  { path: '/coverage', label: 'Coverage' },
  { path: '/directions', label: 'Directions' },
  { path: '/relationships', label: 'Relationships' },
  { path: '/integrity', label: 'Integrity' },
  { path: '/backup', label: 'Backup' },
  { path: '/restore', label: 'Restore' },
  { path: '/help', label: 'Help' },
];
