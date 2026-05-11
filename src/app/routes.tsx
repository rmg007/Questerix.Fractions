export type Route = 'menu' | 'level-map' | 'level' | 'settings';

export interface RouteParams {
  menu: undefined;
  'level-map': undefined;
  level: { levelId: string };
  settings: undefined;
}

// Wouter will be configured in App.tsx to route between these screens
export const routes = {
  menu: '/',
  levelMap: '/levels',
  level: '/level/:levelId',
  settings: '/settings',
};
