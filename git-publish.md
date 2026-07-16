# Git Publish Procedure

Manual release procedure for pushing a signed build to GitHub.
Run this after a new version is approved by AMO

For the first run of this procedure, everything will be executing either in the GIT web interface or in the Cursor interface.
Once the procedure is accurate and successful, it will be converted into a script (see phase 3.6 of Project Plan.md).

Version source of truth: `manifest.json` `version` field (e.g. `0.3.6.1`).
Git tag must match exactly: `v0.3.6.1`.
ALL files are moved from the development repo to the release repo. Nothing is sensitive.

---

## iHerbDev -- finalize the release branch

- [ ] **STOP -- Confirm `main` is clean before proceeding:** In Cursor, open Source Control (Ctrl+Shift+G). The Changes list must be empty. Commit or stash any changes before continuing. The release process will switch branches in iHerbDev and any uncommitted work will be lost.

- [ ] **Create or reset `release` from the version's commit:** 
  - On GitHub, go to the `iHerbDev` repo main page
  - click the commit count link just above the file list (e.g. "47 commits") 
  - find the target commit > click the `<>` (Browse files) button 
  - If `release` already exists: delete it first under GitHub > Branches
  - from the branch dropdown at top-left, type `release` and select "Create branch: release from this commit."

- [ ] **Tag the release commit:** 
  - On GitHub, go to the `iHerbDev` repo > Releases > "Create a new release"
  - "Choose a tag" > type `vX.X.X.X`
  - set target to the `release` branch
  - set title to `vX.X.X.X`
  - fill in the description
  - Choose pre-release since this is a beta
  - Publish release button

---

## iHerb -- publish the release snapshot

The public repo holds one clean commit per release. No development history is exposed.

- [ ] **Create git publish workspace**
  - If the iHerb repo does not exist locally, follow these steps:
    - On GitHub, go to the `iHerb` repo
    - From Quick Setup copy the SSH
    - In Cursor, open the Command Palette (Ctrl+Shift+P) > type "Git: Clone" > paste the SSH you copied
    - choose the Code folder
    - Add the repo to the current Workspace. This workspace is only used for the publishing process. Normal development occurs in the iHerbDev repo.
    - From the Cursor File Menu choose "Save Workspace As..." to rename the workspace to `iHerb GIT Publish` and save it in the `Code` directory

- [ ] **Open this procedure in a browser tab:** 
  - On GitHub, go to the `iHerbDev` repo > main branch > `git-publish.md` > open in a new tab. Keep it open -- switching to the release branch will revert this file locally.

- [ ] **Switch iHerbDev to the release branch:** 
  - In Cursor, click any file in the `iHerbDev` repo to make it the active repo.
  - In Cursor Source Control, open the `...` menu and select **Fetch** to pull the remote `release` branch locally.
  - Click the branch name in the status bar (bottom left) and select `release`.

- [ ] **Replace all files with the release snapshot:** In a terminal:
  ```
  cd /home/megagrubby/Code/iHerb
  rm -rf *
  cp -r /home/megagrubby/Code/iHerbDev/* .
  ```

- [ ] **Commit the iHerb snapshot:** 
  - In Cursor Source Control for the `iHerb` window, click the Commit button.
  - Click Yes to stage all changes.
  - type `Release vX.X.X.X` then click the checkmark (Commit). 
  - Sync the `iHerb` branch

- [ ] **Create the iHerb GitHub release:** 
  - On GitHub, go to the `iHerb` repo > Releases > "Create a new release"
  - "Choose a tag" > type `vX.X.X.X` > target: `main`
  - Title: `vX.X.X.X` 
  - Release notes > short summary of the release. Refer to README.md for full info. 
  - Pre-release for all beta releases.
  - Under "Attach binaries", drag and drop the signed `.xpi` file downloaded from AMO.
  - Publish Release.

- [ ] **Switch iHerbDev back to MAIN:** 
  - In Cursor, select the `iHerbDev` repo to make it the active repo.
  - Go to source control
  - Click the branch name in the status bar and select `main`.

---

## Verify

- [ ] Tag `vX.X.X.X` appears under Releases on both GitHub repos
- [ ] `iHerb` release includes the signed `.xpi` as a downloadable asset
- [ ] `iHerb` repo shows only one commit (or one per prior release) with no development history

- **Switch back to the iHerbDev repo.** Remember, this workspace is only for GIT Publish.
