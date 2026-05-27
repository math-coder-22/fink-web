
# FiNK Budget Planner Concept (Financial Assistant Approach)

## Core Philosophy
FiNK is not an automatic budgeting app.
FiNK helps users:
- understand where money goes
- review spending patterns
- make intentional monthly adjustments
- build financial awareness gradually

The app should:
- guide
- suggest
- highlight
- remind

But NOT:
- auto-control user budgeting
- aggressively optimize
- behave like an AI autopilot

# Journal Action Structure

Primary:
- Review

Tools Dropdown:
- Setup Budget
- Reconcile

# Setup Budget Structure

Header:
Setup Budget
Prepare current month budget based on previous month activity.

Small helper text:
"Budget values are pre-filled based on previous activity and can be adjusted anytime."

# Summary Area

- Income Capacity
- Planned Allocation
- Remaining Capacity

If exceeded:
⚠ Planned allocation exceeds available income capacity

Use budgeted income only.

# Sections

- Income
- Expenses
- Saving
- Debt

Category as heading.
Items slightly indented.

# Table Columns

| Item | Previous Budget | Previous Actual | Budget |

Budget column:
- prefilled automatically
- editable manually
- refresh icon appears if manually modified

No separate suggestion column.

# Recommendation Rules

- stable spending -> keep budget
- slight overspending -> small adjustment
- large overspending -> conservative increase + awareness message
- stable underbudget -> keep budget
- consistent underbudget -> slight reduction

Do not aggressively follow actual spending.

# Insight Style

Use only short contextual micro insights.

Examples:
- Food spending exceeded budget this month.
- Most increase came from Eating Out.
- Spending remained stable this month.

# UX Goal

User should feel:
"FiNK helps me understand and plan my money better."

NOT:
"FiNK is controlling my finances."
