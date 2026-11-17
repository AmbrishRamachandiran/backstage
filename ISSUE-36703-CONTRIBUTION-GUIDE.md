# Contributing to backstage/backstage#36703: Move package README content into backstage.io/docs

This guide covers how to pick up one package from
[issue #36703](https://github.com/backstage/backstage/issues/36703), make the
change, and open a signed-off pull request. Every commit you make for this work
should carry your Infosys sign-off.

A finished example is
[backstage/backstage#36883](https://github.com/backstage/backstage/pull/36883),
which moved the docs for `@backstage/plugin-scaffolder-backend-module-gitea`.
Open its **Files changed** tab next to this guide.

## What the task is, and why we do it

[backstage.io/docs](https://backstage.io/docs) is the source of truth for
Backstage documentation. The site now has an AI assistant, Kapa.ai, that the
community uses to find answers. Kapa.ai and the site search can only answer
from pages published on backstage.io.

A lot of setup and configuration guidance still lives only in package
`README.md` files on GitHub, so search and Kapa.ai can't find it. The issue
lists those packages. For each one we:

1. **Move** the setup, configuration, and usage content from the README into a
   page under `/docs`.
2. **Register** the new page in `microsite/sidebars.ts` so it shows up in the
   site navigation.
3. **Trim** the README to a short overview, the install steps, and a link to
   the new page.

We move content, we don't copy it. After your PR there should be one place
that documents the package, and it's on backstage.io.

## Step 1: one-time setup

1. Fork [backstage/backstage](https://github.com/backstage/backstage) to your
   GitHub account and clone your fork:

   ```bash
   git clone https://github.com/<your-github-user>/backstage.git
   cd backstage
   git remote add upstream https://github.com/backstage/backstage.git
   ```

2. Set your git identity to your Infosys email. The `-s` flag in Step 5 uses
   this to write the `Signed-off-by` line:

   ```bash
   git config user.name "<YourGitHubName>"
   git config user.email "<your.name>@infosys.com"
   ```

   Add `--global` if you want these settings for every repository on your
   machine.

3. Add the same Infosys email to your GitHub account under
   **Settings > Emails**, so GitHub links your commits to your profile.

4. Install Node.js 24 or 26 (see `engines` in the root `package.json`) and run `yarn install`
   in the repository root.

## Step 2: pick a package nobody is working on

1. Open the [issue](https://github.com/backstage/backstage/issues/36703) and
   read the package list.
2. Read **every comment** on the issue. Skip any package someone has claimed.
3. Check for open PRs that already cover the package. Search for the package
   name, for example `scaffolder-backend-module-sentry`:

   - [Open PRs that mention #36703](https://github.com/backstage/backstage/pulls?q=is%3Apr+is%3Aopen+36703)
   - [All open PRs](https://github.com/backstage/backstage/pulls?q=is%3Apr+is%3Aopen),
     with the package name added to the search box

4. Check whether `/docs` already covers the package, because the issue's list
   was generated automatically:

   ```bash
   grep -rl "plugin-scaffolder-backend-module-sentry" docs --include=*.md | grep -v releases
   ```

   If the docs already cover it, comment on the issue to say so, and pick
   another package.

5. Prefer a small package for your first PR. Packages in the "Mentioned in
   passing only" section, such as the scaffolder modules, are a good start
   because `/docs` already has a natural home for them.

## Step 3: claim the package on the issue

Before you write any code, comment on the issue so nobody else starts the same
package. Keep it to one package, or one closely related group, per comment and
per PR. For example:

> I'd like to take `@backstage/plugin-scaffolder-backend-module-sentry` and
> move its setup and usage documentation into a new
> `/docs/features/software-templates/...` page.

The maintainers asked for this so work isn't duplicated. If you later drop the
package, comment again to release it.

## Step 4: make the change

### Create a branch from the latest master

```bash
git fetch upstream
git checkout -b docs/move-<package-short-name>-readme upstream/master
```

For example `docs/move-scaffolder-sentry-readme`.

### Read before you write

- Read the package `README.md` in full.
- Read the package source, especially any config schema (`config.d.ts`) and,
  for scaffolder actions, the action's input and output schema. READMEs are
  often out of date, and the new page must match what the code actually does.
  The Gitea PR found and fixed one such mistake.
- Read the [documentation style guide](https://github.com/backstage/backstage/blob/master/docs/contribute/doc-style-guide.md).
- Look at existing pages near where yours will go, and match their structure.

### 4a. Create the new docs page

Choose the most fitting section:

| Package type                                                   | Where the page usually goes     |
| -------------------------------------------------------------- | ------------------------------- |
| Integration-specific modules (GitHub, GitLab, Gitea, Azure...) | `docs/integrations/<provider>/` |
| Core features (catalog, scaffolder, search, TechDocs...)       | `docs/features/<feature>/`      |
| Backend system packages                                        | `docs/backend-system/`          |
| Configuration topics                                           | `docs/conf/`                    |

Start the file with front matter:

```md
---
id: scaffolder
title: Gitea Scaffolder Actions
sidebar_label: Scaffolder
description: Publishing repositories created by Software Templates to Gitea
---
```

A typical page covers what the package does, installation, configuration
(YAML examples), usage (for example a sample template), and a reference table
of options, inputs, and outputs.

### 4b. Add the page to the sidebar

Add the page's path, without `.md`, to the right group in
`microsite/sidebars.ts`:

```ts
sidebarElementWithIndex({ label: 'Gitea' }, [
  'integrations/gitea/locations',
  'integrations/gitea/discovery',
  'integrations/gitea/scaffolder', // new page
]),
```

### 4c. Update links elsewhere in /docs

Search `/docs` for links to the package's GitHub README and point them at the
new page with a relative link:

```bash
grep -rn "tree/master/plugins/scaffolder-backend-module-sentry" docs --include=*.md | grep -v releases
```

For example, `docs/features/software-templates/builtin-actions.md` lists every
scaffolder module. Never edit files in `docs/releases`.

### 4d. Trim the README

Reduce the README to a one-paragraph overview, the installation steps, and a
link to the new page using the full `https://backstage.io/docs/...` URL. The
README is shown on GitHub and npm, so relative links don't work there.

```md
## Documentation

See [Gitea Scaffolder Actions](https://backstage.io/docs/integrations/gitea/scaffolder)
for configuration, an example template, and the full list of action inputs and
outputs.
```

### 4e. Add a changeset

The README ships with the published npm package, so add a changeset. Create
`.changeset/<short-name>-docs.md` by hand; don't use the changeset CLI:

```md
---
'@backstage/plugin-scaffolder-backend-module-sentry': patch
---

The package README now links to the new Sentry Scaffolder Actions guide on backstage.io, which covers configuration and the full list of action inputs.
```

Use `patch`, and write the message for Backstage adopters in plain language.

### 4f. Format and check

```bash
yarn prettier --write docs/<your-new-page>.md microsite/sidebars.ts plugins/<package>/README.md .changeset/<your-changeset>.md
```

Optional: preview the site with `cd microsite && yarn install && yarn start`.
The first compile builds the whole site and needs at least 4 GB of RAM. On WSL,
set `memory=` in `C:\Users\<you>\.wslconfig` and run `wsl --shutdown` if it
takes too long.

## Step 5: commit with your Infosys sign-off

Backstage requires a [Developer Certificate of Origin](https://github.com/backstage/backstage/blob/master/CONTRIBUTING.md#developer-certificate-of-origin)
sign-off on every commit. Always commit with `-s`:

```bash
git add docs/ microsite/sidebars.ts plugins/<package>/README.md .changeset/
git commit -s -m "docs(<area>): move <package-short-name> documentation to backstage.io" -m "Refs #36703"
```

Check that the sign-off uses your Infosys email:

```bash
git log -1
```

The message must end with
`Signed-off-by: <YourGitHubName> <your.name>@infosys.com`. If it's missing or
wrong, fix it before pushing:

```bash
git commit --amend -s --no-edit
```

## Step 6: push and open the pull request

```bash
git push -u origin docs/move-<package-short-name>-readme
```

On GitHub, open a PR from your fork's branch into `backstage/backstage`
`master`.

- **Title:** `docs(<area>): move <package-short-name> documentation to backstage.io`
- **Description:** keep the repository's PR template and fill it in. Don't
  delete it. Start with `Part of #36703` so the PR appears on the issue for the
  maintainers. List what you moved, where you moved it, and any corrections you
  made to the old README content. Only tick checklist items you actually did,
  typically the changeset, documentation, and `Signed-off-by` items.

Example description:

```md
## Hey, I just made a Pull Request!

Part of #36703.

Moves the setup, configuration, and usage documentation for
`@backstage/plugin-scaffolder-backend-module-sentry` from the package README
into a new page at `docs/...`.

- Adds the new page to the sidebar.
- Points the entry in the built-in actions list at the new page.
- Trims the package README to an overview, installation, and a link.
```

## Step 7: after you open the PR

- Watch the CI checks. The DCO check fails if any commit lacks a sign-off. To
  fix every commit on the branch at once:

  ```bash
  git rebase --signoff upstream/master
  git push --force-with-lease
  ```

- Reply to review comments and push follow-up commits, each made with
  `git commit -s`.
- Once merged, the maintainers tick the package off the issue list.

## Quick checklist

- [ ] Package not claimed in issue comments and no open PR for it
- [ ] Claimed the package with a comment on #36703
- [ ] Branch created from the latest `upstream/master`
- [ ] New page in `/docs` with front matter, checked against the source code
- [ ] Page added to `microsite/sidebars.ts`
- [ ] Links in `/docs` updated to the new page
- [ ] README trimmed to overview, installation, and a backstage.io link
- [ ] Changeset added (`patch`)
- [ ] Files formatted with Prettier
- [ ] Every commit made with `git commit -s` and an `@infosys.com` sign-off
- [ ] PR opened with the template filled in and `Part of #36703`
