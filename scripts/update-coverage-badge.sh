#!/usr/bin/env bash
set -euo pipefail

# Run tests with coverage
pnpm test:coverage

# Extract coverage % and determine badge color
BADGE_INFO=$(node -e "
  const c = JSON.parse(require('fs').readFileSync('./coverage/coverage-summary.json', 'utf8'));
  const pct = c.total.lines.pct;
  const color = pct >= 80 ? 'brightgreen' : pct >= 60 ? 'yellow' : pct >= 40 ? 'orange' : 'red';
  console.log(pct + ' ' + color);
")

COVERAGE=$(echo "$BADGE_INFO" | cut -d' ' -f1)
COLOR=$(echo "$BADGE_INFO" | cut -d' ' -f2)

# Download badge SVG
mkdir -p badges
curl -s "https://img.shields.io/badge/coverage-${COVERAGE}%25-${COLOR}" -o ./badges/coverage.svg

# Update the coverage badge in README.md
sed -i '' "s|!\[check-code-coverage\].*|![check-code-coverage](./badges/coverage.svg)|" README.md

# Stage the updated badge and README
git add badges/coverage.svg README.md

echo "Coverage badge updated: ${COVERAGE}% (${COLOR})"
