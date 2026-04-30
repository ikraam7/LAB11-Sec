// bypass_native.js — Bypass native root checks

// Chemins suspects pour root
const SUS = [
  "/system/bin/su",
  "/system/xbin/su",
  "/sbin/su",
  "/system/su",
  "/system/bin/busybox",
  "/system/xbin/busybox",
  "/proc/mounts",
  "/proc/self/mounts"
];

// Vérifie si le chemin est suspect
function isSuspiciousPath(ptrPath) {
  try {
    const p = ptrPath.readCString();

    if (!p) {
      return false;
    }

    for (let i = 0; i < SUS.length; i++) {
      if (p.indexOf(SUS[i]) !== -1) {
        return true;
      }
    }

    return false;
  } catch (_) {
    return false;
  }
}

// Hook une fonction native
function hookFunc(name, argIndexForPath) {
  try {
    const addr = Module.getExportByName(null, name);

    Interceptor.attach(addr, {
      onEnter(args) {
        const pathPtr = args[argIndexForPath];

        if (pathPtr && isSuspiciousPath(pathPtr)) {
          this.block = true;
          this.path = pathPtr.readCString();
        }
      },

      onLeave(retval) {
        if (this.block) {
          console.log("[+] Blocked native " + name + " on " + this.path);
          retval.replace(ptr(-1)); // Retourner -1 (erreur)
        }
      }
    });

    console.log("[+] Hooked native function: " + name);
  } catch (e) {
    console.log("[*] Native function not found: " + name);
  }
}

// Hook des fonctions système
hookFunc("open", 0);    // open(path)
hookFunc("openat", 1);  // openat(dirfd, path)
hookFunc("access", 0);  // access(path)
hookFunc("stat", 0);    // stat(path)
hookFunc("lstat", 0);   // lstat(path)