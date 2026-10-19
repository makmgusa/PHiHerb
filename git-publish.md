# Git Publish Procedure

Manual release procedure for pushing a signed build to GitHub.
Run this after a new version is loaded into both the Chrome extension store and AMO.

For the first run of this procedure, everything will be executing either in the GIT web interface or in the Cursor interface.
Once the procedure is accurate and successful, it will be converted into a script in a later project phase.

Version source of truth: `manifest.json` `version` field.
Git tag must match exactly: `vX.X.X`.
ALL files are moved from the development repo to the release repo. Nothing is sensitive.

---

## iHerbDev -- finalize the release branch

- [ ] **STOP -- Confirm `main` is clean before proceeding:** In Cursor, open Source Control (Ctrl+Shift+G). The Changes list must be empty. Commit or stash any changes before continuing. The release process will switch branches in iHerbDev and any uncommitted work will be lost.

- [ ] **Create or reset `release` from the version's commit:** 
  - On GitHub, go to the `iHerbDev` repo main page
  - If `release` already exists: delete it first under GitHub > Branches
  - click the commit count link just above the file list (e.g. "47 commits") 
  - find the target commit > click the `<>` (Browse files) button 
  - from the branch dropdown at top-left, type `release` and select "Create branch: release from this commit."

- [ ] **Tag the release commit:** 
  - On GitHub, go to the `iHerbDev` repo > Releases > "Draft a new release"
  - "Choose a tag" > type `vX.X.X`
  - set target to the `release` branch
  - set title to `vX.X.X`
  - fill in the description
  - Choose release Latest (pre-release for beta)
  - Publish release button

---

## PHiHerb -- publish the release snapshot

The public repo holds one clean commit per release. No development history is exposed.

- [ ] **Create git publish workspace**
  - If the PHiHerb repo does not exist locally, follow these steps:
    - On GitHub, go to the `PHiHerb` repo
    - From Quick Setup copy the SSH
    - In Cursor, open the Command Palette (Ctrl+Shift+P) > type "Git: Clone" > paste the SSH you copied
    - choose the Code folder
    - Add the repo to the current Workspace. This workspace is only used for the publishing process. Normal development occurs in the iHerbDev repo.
    - From the Cursor File Menu choose "Save Workspace As..." to rename the workspace to `PHiHerb GIT Publish` and save it in the `Code` directory

- [ ] **Open this procedure in a browser tab:** 
  - On GitHub, go to the `iHerbDev` repo > main branch > `git-publish.md` > open in a new tab. Keep it open -- switching to the release branch will revert this file locally.
  - From this point forward, follow the git-publish procedure in the browser tab. 
  - If changes are needed, take note outside of Cursor and update this procedure once git-publish is complete

- [ ] **Switch iHerbDev to the release branch:** 
The goal is to update the local repository with the Release tagged branch that was generated on the git site.
  - In Cursor, click any file in the `iHerbDev` repo to make it the active repo.
  - Click the branch name in the status bar (bottom left) and select `main`.
  - In Cursor Source Control, open the `...` menu and select **Fetch**.
  - Click the branch name in the status bar and select `release`.
  - In Cursor Source Control, open the `...` menu and select **Pull**.
  - Confirm `manifest.json` shows the release version.

- [ ] **Replace all files with the release snapshot:** In a terminal:
  ```
  cd /home/megagrubby/Code/PHiHerb
  rm -rf *
  cp -r /home/megagrubby/Code/iHerbDev/* .
  ```

- [ ] **Commit the PHiHerb snapshot:** 
  - Switch Cursor to the PHiHerb repo.
  - In Cursor Source Control for the `PHiHerb` window, click the Commit button.
  - Click Yes to stage all changes.
  - type `Release vX.X.X` then click the checkmark (Commit). 
  - Sync the `PHiHerb` branch

- [ ] **Create the PHiHerb GitHub release:** 
  - On GitHub, go to the `PHiHerb` repo > Releases > "Draft a new release"
  - "Choose a tag" > type `vX.X.X` > target: `main`
  - Title: `vX.X.X` 
  - Release notes > short summary of the release. Refer to README.md for full info. 
  - Choose release Latest (pre-release for beta)
  - Under "Attach binaries", drag and drop the signed `.xpi` file downloaded from AMO.
  - Publish Release.

- [ ] **Switch iHerbDev back to MAIN:** 
  - In Cursor, select the `iHerbDev` repo to make it the active repo.
  - Go to source control
  - Click the branch name in the status bar and select `main`.

---

## Verify

- [ ] Tag `vX.X.X` appears under Releases on both GitHub repos
- [ ] `PHiHerb` release includes the signed `.xpi` as a downloadable asset
- [ ] `PHiHerb` repo shows only one commit (or one per prior release) with no development history

- **Switch back to the iHerbDev repo.** Remember, this workspace is only for GIT Publish.

## Automation
Every publish seems to have a change. Usually on the GIT side but sometimes on the Cursor side. Until things are stable do not consider automating the publish process (it is pretty quick manually).

Upon automating, ensure script steps are first manually executed in terminal. Also ensure the script captures errors and halts. Also ensure recovery or rerun is easy.
