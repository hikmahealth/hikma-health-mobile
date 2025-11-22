#!/bin/bash
echo "Applying patch to react-native-date-picker..."

# Navigate to the specific package
cd node_modules/react-native-date-picker

# Apply the patch
git apply ../../patches/react-native-date-picker+5.0.13.patch
