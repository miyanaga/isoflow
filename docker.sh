#!/bin/bash

# Docker registry and image name
REGISTRY="docker.lab.ideamans.com"
IMAGE_NAME="isoflow"
FULL_IMAGE="$REGISTRY/$IMAGE_NAME"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "Building Docker image for $FULL_IMAGE"
echo "Version: $VERSION"
echo "Platform: linux/amd64 (forced)"

# Ensure buildx is available and create/use a builder instance
docker buildx create --use --name isoflow-builder 2>/dev/null || docker buildx use isoflow-builder

# Build and push the image for amd64 platform only
echo "Building and pushing for amd64 platform..."
docker buildx build \
  --platform linux/amd64 \
  -t "$FULL_IMAGE:latest" \
  -t "$FULL_IMAGE:$VERSION" \
  --push \
  .

if [ $? -ne 0 ]; then
  echo "Error: Docker build or push failed"
  exit 1
fi

echo "Build and push successful!"
echo "Images pushed:"
echo "  - $FULL_IMAGE:latest (amd64)"
echo "  - $FULL_IMAGE:$VERSION (amd64)"