# CI/CD Documentation

This document describes the automated build and deployment pipeline for MiniCalen.

## 🔄 GitHub Actions Workflow

MiniCalen uses GitHub Actions to automatically build and publish Docker images when release tags are created.

### Workflow File

Location: `.github/workflows/docker-release.yml`

### Trigger

The workflow triggers on push of tags matching the pattern `*-RELEASE`:

```bash
git tag v1.0.0-RELEASE
git push origin v1.0.0-RELEASE
```

### What the Workflow Does

1. **Checkout Code**: Downloads the repository source code
2. **Setup Node.js**: Installs Node.js 20 with npm caching
3. **Install Dependencies**: Runs `npm ci` to install all dependencies
4. **Extract Versions**: Reads version numbers from package.json files
5. **Docker Login**: Authenticates with Docker Hub using secrets
6. **Build Images**: Creates multi-architecture Docker images for both packages
7. **Push Images**: Publishes images to Docker Hub with multiple tags

### Image Tags

Each successful build creates multiple tags:

#### Frontend Images
- `{DOCKER_USERNAME}/minicalen-frontend:{FRONTEND_VERSION}` (e.g., `1.0.0`)
- `{DOCKER_USERNAME}/minicalen-frontend:{COMMIT_SHA}` (e.g., `abc12345`)
- `{DOCKER_USERNAME}/minicalen-frontend:latest`

#### Server Images
- `{DOCKER_USERNAME}/minicalen-server:{SERVER_VERSION}` (e.g., `1.0.0`)
- `{DOCKER_USERNAME}/minicalen-server:{COMMIT_SHA}` (e.g., `abc12345`)
- `{DOCKER_USERNAME}/minicalen-server:latest`

### Multi-Architecture Support

Images are built for:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, including Apple Silicon and ARM servers)

## ⚙️ Configuration

### Required Secrets

Configure these in GitHub repository settings → Secrets and variables → Actions:

| Secret | Description | Example |
|--------|-------------|---------|
| `DOCKER_USERNAME` | Docker Hub username | `mycompany` |
| `DOCKER_PASSWORD` | Docker Hub password or access token | `dckr_pat_...` |

### Repository Setup

1. **Enable Actions**: Ensure GitHub Actions are enabled in repository settings
2. **Add Secrets**: Configure Docker Hub credentials
3. **Verify Permissions**: Ensure the repository has write access to packages

## 🚀 Release Process

### Step-by-Step Release

1. **Update Versions**: Modify version numbers in package.json files:
   ```bash
   # Update frontend version
   cd packages/frontend
   npm version patch  # or minor, major
   
   # Update server version  
   cd ../server
   npm version patch  # or minor, major
   ```

2. **Commit Changes**:
   ```bash
   git add packages/*/package.json
   git commit -m "chore: bump version to 1.0.1"
   git push origin main
   ```

3. **Create Release Tag**:
   ```bash
   git tag v1.0.1-RELEASE
   git push origin v1.0.1-RELEASE
   ```

4. **Monitor Build**: Check GitHub Actions tab for build progress

5. **Verify Images**: Confirm images are available on Docker Hub

### Version Strategy

Use semantic versioning (SemVer):
- **Patch** (1.0.1): Bug fixes, small improvements
- **Minor** (1.1.0): New features, backward compatible
- **Major** (2.0.0): Breaking changes

### Tag Naming Convention

- `v{version}-RELEASE`: Production releases (triggers CI/CD)
- `v{version}-RC`: Release candidates (no CI/CD trigger)
- `v{version}-BETA`: Beta releases (no CI/CD trigger)

## 🔍 Monitoring and Troubleshooting

### Build Status

Monitor builds at: `https://github.com/{owner}/minicalen/actions`

### Common Issues

#### Authentication Failures
- **Symptom**: Docker login fails
- **Solution**: Verify `DOCKER_USERNAME` and `DOCKER_PASSWORD` secrets
- **Check**: Ensure Docker Hub token has write permissions

#### Build Failures
- **Symptom**: Docker build fails
- **Solution**: Check Dockerfile syntax and dependencies
- **Debug**: Review build logs in GitHub Actions

#### Multi-Architecture Issues
- **Symptom**: ARM64 build fails
- **Solution**: Ensure all dependencies support ARM64
- **Workaround**: Temporarily remove ARM64 from platforms list

### Manual Debugging

Test builds locally:

```bash
# Test frontend build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f packages/frontend/Dockerfile \
  -t test-frontend .

# Test server build  
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -f packages/server/Dockerfile \
  -t test-server .
```

## 🔒 Security Considerations

### Secret Management
- Use Docker Hub access tokens instead of passwords
- Rotate secrets regularly
- Limit token permissions to necessary repositories

### Image Security
- Images use Node.js Alpine base for smaller attack surface
- Multi-stage builds exclude development dependencies
- Regular base image updates via Dependabot

### Access Control
- Limit GitHub Actions permissions
- Use environment protection rules for production
- Enable branch protection rules

## 📈 Future Enhancements

Potential workflow improvements:
- Add security scanning with tools like Trivy
- Implement staging environment deployments
- Add automated testing before image builds
- Include changelog generation
- Add notification webhooks for deployment teams
