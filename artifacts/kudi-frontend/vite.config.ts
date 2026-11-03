import { defineConfig } from 'vite';
import { resolve } from 'path';

// Multi-page application — 12 HTML entry points, no React, no Tailwind.
// CSS and JS are served as plain static assets (referenced directly in HTML).
export default defineConfig({
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main:             resolve(__dirname, 'index.html'),
        login:            resolve(__dirname, 'login.html'),
        signup:           resolve(__dirname, 'signup.html'),
        dashboardBuyer:   resolve(__dirname, 'dashboard-buyer.html'),
        dashboardSeller:  resolve(__dirname, 'dashboard-seller.html'),
        dashboardSupport: resolve(__dirname, 'dashboard-support.html'),
        transaction:      resolve(__dirname, 'transaction.html'),
        newTransaction:   resolve(__dirname, 'new-transaction.html'),
        developer:        resolve(__dirname, 'developer.html'),
        aboutUs:          resolve(__dirname, 'about-us.html'),
        team:             resolve(__dirname, 'team.html'),
        blog:             resolve(__dirname, 'blog.html'),
        blogPost:         resolve(__dirname, 'blog-post.html'),
        contactUs:        resolve(__dirname, 'contact-us.html'),
        faq:              resolve(__dirname, 'faq.html'),
        privacy:          resolve(__dirname, 'privacy.html'),
        terms:            resolve(__dirname, 'terms.html'),
        adminCms:         resolve(__dirname, 'admin-cms.html'),
        directories:      resolve(__dirname, 'directories.html'),
        adminDirectories: resolve(__dirname, 'admin-directories.html'),
        adminLanguages:   resolve(__dirname, 'admin-languages.html'),
        legal:            resolve(__dirname, 'legal.html'),
        documentation:    resolve(__dirname, 'documentation.html'),
        docArticle:       resolve(__dirname, 'doc-article.html'),
        pricing:          resolve(__dirname, 'pricing.html'),
      },
    },
  },
  server: {
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
    allowedHosts: true,
  },
  preview: {
    port: parseInt(process.env.PORT || '3000'),
    host: '0.0.0.0',
    allowedHosts: true,
  },
});
