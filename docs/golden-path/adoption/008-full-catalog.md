---
id: full-catalog
sidebar_label: 008 - A Full Catalog
title: Ensuring your catalog stays complete
description: Strategies for maintaining a complete and up-to-date software catalog
---

Along your Backstage journey (and any workflow migration journey), you will hit a point where incremental adoption is no longer easy. The new developers are no longer flowing into your tool like they once did. More and more projects are not being listed in your catalog. Something has to change.

## Enforcing Catalog Files in CI

The most reliable way to close gaps in your catalog is to make it impossible to merge new services without a `catalog-info.yaml`. This turns catalog completeness from a voluntary effort into an automated requirement.

### Validate with a GitHub Actions workflow

Add a workflow that fails the pull request if the repository does not contain a `catalog-info.yaml` at its root:

```yaml title=".github/workflows/require-catalog-entry.yml"
name: Require catalog entry

on:
  pull_request:
    branches: [main]

jobs:
  check-catalog:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check for catalog-info.yaml
        run: |
          if [ ! -f catalog-info.yaml ]; then
            echo "::error::This repository is missing a catalog-info.yaml file."
            echo "Add a catalog-info.yaml to register this service in the Backstage catalog."
            echo "See https://backstage.example.com/docs/default/component/backstage/getting-started for help."
            exit 1
          fi
```

Point the error message at your internal getting-started guide so developers know exactly what to add and how.

### Validate the file's content

A `catalog-info.yaml` that is present but malformed will fail to ingest silently. Use the Backstage CLI to validate the file's schema as part of CI:

```yaml title=".github/workflows/require-catalog-entry.yml"
- name: Validate catalog-info.yaml
  run: npx @backstage/cli catalog:validate --file catalog-info.yaml
```

This catches common mistakes — missing required fields, wrong `kind` values, malformed `spec.owner` — before the file ever reaches your Backstage instance.

### Use a repository template

Prevent the problem at creation time by including a `catalog-info.yaml` in your GitHub repository template. Developers who create a new service from the template automatically have a valid catalog entry from the first commit. Backstage's own [Software Templates](../../features/software-templates/index.md) can create the repository _and_ register the entity in one step, making the CI check a safety net rather than the primary enforcement mechanism.

## Leadership Initiatives

CI enforcement alone won't fill in the backlog of services that already exist without catalog entries. For that, you need organizational momentum — and that usually requires leadership alignment.

### Set a target and measure progress

Pick a metric that is easy to track and easy to explain. "Percentage of active repositories with a valid `catalog-info.yaml`" is one effective option. Export the list of repositories from your SCM, cross-reference it with the entities in your catalog, and compute the gap. Review the metric in team meetings on a regular cadence.

Sharing a visible, improving number gives developers a concrete goal and gives leadership something to point to when asking whether the investment is paying off.

### Make catalog completeness part of team goals

Work with engineering leadership to include catalog completeness as part of quarterly or half-year team objectives. Teams respond to goals that are part of their performance conversations. A target like "all services owned by this team are registered in the catalog before end of quarter" is specific, measurable, and achievable in a short time box.

Avoid framing this as a policing exercise. Frame it as a reliability improvement: teams with complete catalog entries get better incident routing, clearer ownership, and free integrations with search, TechDocs, and scorecard tooling.

### Run a catalog completeness sprint

A focused, time-boxed effort across multiple teams can close a large portion of the backlog quickly. The format that works well:

1. Identify the top 20–50 missing services by repository activity (most commits or most contributors in the last six months).
2. Assign each missing service to its owning team.
3. Set a two-week window and provide a template and a short how-to guide.
4. Offer office hours or a dedicated Slack channel for questions.
5. Celebrate the teams that finish — a shout-out in the engineering newsletter goes a long way.

After the sprint, the CI enforcement workflow catches anything that slips through going forward.

### Link catalog completeness to developer experience metrics

If your organization tracks developer experience (through surveys, DORA metrics, or internal tooling), build a case that catalog completeness correlates with the outcomes leadership cares about. Teams with complete and well-annotated catalog entries tend to have faster incident resolution, clearer runbooks, and less time spent chasing down who owns what. Surfacing that connection makes the catalog feel less like overhead and more like infrastructure worth investing in.
