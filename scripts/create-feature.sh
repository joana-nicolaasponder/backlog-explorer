#!/bin/bash

# Check if feature name is provided
if [ -z "$1" ]; then
    echo "Please provide a feature name"
    echo "Usage: ./create-feature.sh feature-name"
    exit 1
fi

# Convert feature name to kebab case and create branch name
FEATURE_NAME=$(echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-')
BRANCH_NAME="feature/$FEATURE_NAME"

# Switch to develop branch and update it
git checkout develop
git pull origin develop

# Create and switch to new feature branch
git checkout -b "$BRANCH_NAME"

echo "Created and switched to branch $BRANCH_NAME"
echo "You can now start working on your feature!"
