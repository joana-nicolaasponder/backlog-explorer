#!/bin/bash

# Check if feature name is provided
if [ -z "$1" ]; then
    echo "Please provide a feature name"
    echo "Usage: ./scripts/create-feature.sh feature-name"
    exit 1
fi

# Convert feature name to kebab case and clean it
FEATURE_NAME=$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | sed 's/[^a-zA-Z0-9-]//g')

# Make sure we're up to date with develop
git checkout develop
git pull origin develop

# Create and checkout new feature branch
git checkout -b "feature/$FEATURE_NAME"

echo "Created and switched to branch feature/$FEATURE_NAME"
echo "You can now start working on your feature!"
