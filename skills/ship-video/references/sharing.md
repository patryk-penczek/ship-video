# Sharing the machine

Read at steps 1b, 5 and 9, whenever you start or stop a dev server or a render. Several Claude sessions may share `~/.ship-video`, the CPU and dev-server ports.

- **Stop only what you started, by PID.** Renders: `node $S/render.mjs --stop <out.mp4>`. Never `pkill`/`killall` render, chrome or node: that kills other sessions' work.
- **One film folder per session.** A live `<film>/out/*.pid` means another session is rendering there: leave it alone.
- **Dev servers:** use the one already answering (check the port first); start one only if none does, note its PID, and stop it when you're done.
- **Deleting:** use absolute paths (the shell's cwd resets between calls and `rm` safety checks quote the wrong folder), and guard variables: `rm -rf "${D:?}"`.
- **Heavy work in parallel** (two renders, a render plus capture) slows everything 2–3×: tell the user the longer ETA.
- **Downloads and untrusted files:** keep them in their own folder and run Python with `-I`.
