# Netlify Deployment Guide

This guide explains how to deploy the Gate Access System to Netlify.

## Prerequisites

- A Netlify account (free tier works fine)
- Git repository with your code

## Deployment Steps

### Option 1: Deploy via Netlify UI

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Ready for Netlify deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select the repository

3. **Configure Build Settings**
   Netlify will auto-detect settings from `netlify.toml`, but verify:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist/spa`
   - **Node version**: 20 (specified in `.nvmrc`)

4. **Deploy**
   - Click "Deploy site"
   - Netlify will build and deploy your app automatically

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**
   ```bash
   # Build the project first
   npm run build
   
   # Deploy
   netlify deploy --prod
   ```

## Configuration Files

- **`netlify.toml`**: Contains build settings, redirects, and headers
- **`.nvmrc`**: Specifies Node.js version (20)

## Build Output

The Quasar SPA build outputs to `dist/spa/` directory, which is configured in `netlify.toml`.

## Environment Variables

If you need environment variables:
1. Go to Site settings → Environment variables
2. Add your variables
3. They'll be available during build time

## Custom Domain

1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow Netlify's DNS instructions

## Troubleshooting

### Build Fails
- Check Node version matches `.nvmrc` (Node 20)
- Ensure all dependencies are in `package.json`
- Check build logs in Netlify dashboard

### Routing Issues
- The app uses hash routing (`#/gate-access`), which works out of the box
- If switching to history mode, update `netlify.toml` redirects

### Assets Not Loading
- Verify `publicPath` in `quasar.config.js` (should be `/` for root)
- Check that all assets are in the `public/` folder

## Continuous Deployment

Once connected to Git, Netlify will automatically deploy:
- Every push to the main branch (production)
- Pull requests get preview deployments

## Support

For issues, check:
- [Netlify Docs](https://docs.netlify.com/)
- [Quasar Deployment Guide](https://quasar.dev/quasar-cli-vite/developing-spa/deployment)

