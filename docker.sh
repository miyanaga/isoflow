#!/bin/bash

# Docker registry and image name
REGISTRY="docker.lab.ideamans.com"
IMAGE_NAME="isoflow"
FULL_IMAGE="$REGISTRY/$IMAGE_NAME"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "Building Docker image for $FULL_IMAGE"
echo "Version: $VERSION"

# Build the image for amd64 platform
echo "Building for amd64 platform..."
docker buildx build \
  --platform linux/amd64 \
  -t "$FULL_IMAGE:latest" \
  -t "$FULL_IMAGE:$VERSION" \
  .

if [ $? -ne 0 ]; then
  echo "Error: Docker build failed"
  exit 1
fi

echo "Build successful!"

# Push both tags
echo "Pushing $FULL_IMAGE:latest..."
docker push "$FULL_IMAGE:latest"

if [ $? -ne 0 ]; then
  echo "Error: Failed to push :latest tag"
  exit 1
fi

echo "Pushing $FULL_IMAGE:$VERSION..."
docker push "$FULL_IMAGE:$VERSION"

if [ $? -ne 0 ]; then
  echo "Error: Failed to push :$VERSION tag"
  exit 1
fi

echo "Successfully pushed both tags!"
echo "Images pushed:"
echo "  - $FULL_IMAGE:latest"
echo "  - $FULL_IMAGE:$VERSION"