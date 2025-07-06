# Issue Processing Workflow

## Overview
This workflow describes how to systematically process GitHub issues one by one, ensuring consistency and quality in development.

## Standard Process

### 1. Fetch Issues
```bash
# List all open issues
gh issue list --state open

# Filter by specific labels
gh issue list --state open --label "bug"
gh issue list --state open --label "feature"
```

### 2. For Each Issue

#### Step 1: Create Branch
```bash
git checkout main
git pull origin main
git checkout -b "issue-{number}-{brief-description}"
```

#### Step 2: Implementation
- Read issue description carefully
- Plan implementation steps
- Write code following existing patterns
- Test changes locally

#### Step 3: Testing
```bash
npm run build    # Check compilation
npm run lint     # Check code style
npm run typecheck # Type checking
```

#### Step 4: Commit & Push
```bash
git add -A
git commit -m "feat: {issue title} (fixes #{number})"
git push -u origin "issue-{number}-{brief-description}"
```

#### Step 5: Create PR
```bash
gh pr create --title "feat: {issue title} (fixes #{number})" --body "Closes #{number}"
```

#### Step 6: Verify & Merge
- Check CI/CD passes
- Test deployment preview
- Merge if all checks pass

### 3. Move to Next Issue
Repeat process for next issue in priority order.

## Issue Prioritization

Process in this order:
1. **Critical bugs** - Fix immediately
2. **Security issues** - High priority
3. **Features** - New functionality
4. **Enhancements** - Improvements
5. **Documentation** - Updates

## Branch Naming Convention

- `issue-{number}-{slug}` - Feature/enhancement
- `bug-{number}-{slug}` - Bug fixes  
- `docs-{number}-{slug}` - Documentation

Examples:
- `issue-15-marketplace-frontend`
- `bug-23-routing-404`
- `docs-12-api-documentation`

## Commit Message Format

```
{type}: {description} (fixes #{issue_number})

{optional body}

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`

## Quality Checklist

Before creating PR:
- [ ] Code builds without errors
- [ ] Follows existing code style
- [ ] No linting warnings
- [ ] Types are correct
- [ ] Functionality tested manually
- [ ] Commit message follows format
- [ ] Branch name is descriptive

## Benefits

1. **Systematic**: Every issue processed the same way
2. **Traceable**: Clear link between issues and changes
3. **Quality**: Consistent testing and review
4. **Efficient**: Streamlined process saves time
5. **Organized**: Proper branching strategy