import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'QuizUP Backend API',
  tagline: 'Node.js Backend API Documentation',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://your-domain.com',
  baseUrl: '/backend-docs/',

  // GitHub pages deployment config.
  organizationName: 'your-org',
  projectName: 'quizup-backend',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you would put:
  // lang: 'zh-CN',

  // Useful options to enforce blogging best practices
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/your-org/quizup-backend/tree/main/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/your-org/quizup-backend/tree/main/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/quizup-social-card.jpg',
    navbar: {
      title: 'QuizUP Backend',
      logo: {
        alt: 'QuizUP Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          label: 'API Reference',
          href: '/api',
          position: 'left',
        },
        {
          href: 'https://github.com/your-org/quizup-backend',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/intro',
            },
            {
              label: 'API Reference',
              to: '/api',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/quizup',
            },
            {
              label: 'Discord',
              href: 'https://discordapp.com/invite/quizup',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'GitHub',
              href: 'https://github.com/your-org/quizup-backend',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} QuizUP Team. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
