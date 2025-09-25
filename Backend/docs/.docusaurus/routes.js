import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/backend-docs/docs',
    component: ComponentCreator('/backend-docs/docs', '096'),
    routes: [
      {
        path: '/backend-docs/docs',
        component: ComponentCreator('/backend-docs/docs', 'a7c'),
        routes: [
          {
            path: '/backend-docs/docs',
            component: ComponentCreator('/backend-docs/docs', 'ba9'),
            routes: [
              {
                path: '/backend-docs/docs/architecture',
                component: ComponentCreator('/backend-docs/docs/architecture', 'b1f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/backend-docs/docs/intro',
                component: ComponentCreator('/backend-docs/docs/intro', 'aac'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
