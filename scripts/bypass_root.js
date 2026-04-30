// bypass_root.js — Version corrigée pour RootBeer Sample
// Ce script utilise Frida pour contourner les vérifications de root dans les applications Android,
// en particulier celles utilisant la bibliothèque RootBeer pour détecter l'accès root.

// Fonction principale exécutée dans le contexte Java de l'application cible
Java.perform(function () {
  console.log("[+] Bypass RootBeer lancé");

  // 1. Modification de Build.TAGS
  // Les applications vérifient souvent si Build.TAGS contient "test-keys" pour détecter un device rooté.
  // On le remplace par "release-keys" pour simuler un device officiel.
  try {
    var Build = Java.use("android.os.Build");
    Build.TAGS.value = "release-keys";
    console.log("[+] Build.TAGS -> release-keys");
  } catch (e) {
    console.log("[-] Build.TAGS erreur : " + e);
  }

  // 2. Contournement des méthodes de RootBeer
  // RootBeer est une bibliothèque populaire pour détecter le root sur Android.
  // On hook toutes ses méthodes de détection pour qu'elles retournent toujours false.
  try {
    var RootBeer = Java.use("com.scottyab.rootbeer.RootBeer");

    // Liste des méthodes de RootBeer à hooker
    var methods = [
      "isRooted",
      "isRootedWithoutBusyBoxCheck",
      "detectRootManagementApps",
      "detectPotentiallyDangerousApps",
      "detectRootCloakingApps",
      "checkForBusyBoxBinary",
      "checkForSuBinary",
      "checkSuExists",
      "checkForRWPaths",
      "checkForDangerousProps",
      "checkForRootNative",
      "checkForMagiskBinary"
    ];

    // Pour chaque méthode, on hook toutes ses surcharges pour retourner false
    methods.forEach(function (name) {
      try {
        RootBeer[name].overloads.forEach(function (overload) {
          overload.implementation = function () {
            console.log("[+] RootBeer." + name + " -> false");
            return false;
          };
        });
      } catch (e) {
        console.log("[*] Méthode absente : " + name);
      }
    });

    console.log("[+] RootBeer hooks installed");
  } catch (e) {
    console.log("[-] RootBeer erreur : " + e);
  }

  // 3. Contournement de File.exists
  // Les applications vérifient souvent l'existence de fichiers indicateurs de root (su, busybox, etc.).
  // On hook File.exists pour retourner false pour ces chemins suspects.
  try {
    var File = Java.use("java.io.File");

    File.exists.implementation = function () {
      var path = this.getAbsolutePath();

      if (
        path.indexOf("su") !== -1 ||
        path.indexOf("busybox") !== -1 ||
        path.indexOf("magisk") !== -1 ||
        path.indexOf("Superuser") !== -1 ||
        path.indexOf("SuperSU") !== -1
      ) {
        console.log("[+] File.exists bypass: " + path);
        return false;
      }

      return this.exists();
    };

    console.log("[+] File.exists hook installed");
  } catch (e) {
    console.log("[-] File.exists erreur : " + e);
  }

  // 4. Contournement corrigé de Runtime.exec
  // Les applications exécutent des commandes shell pour vérifier le root (su, busybox, etc.).
  // On hook Runtime.exec pour bloquer ou remplacer ces commandes par des commandes inoffensives.
  try {
    var Runtime = Java.use("java.lang.Runtime");

    var execString = Runtime.exec.overload("java.lang.String");
    var execArray = Runtime.exec.overload("[Ljava.lang.String;");

    // Fonction helper pour détecter les commandes suspectes
    function isSuspiciousCommand(cmd) {
      if (!cmd) return false;

      var c = cmd.toString().toLowerCase();

      return (
        c === "su" ||
        c.indexOf("which su") !== -1 ||
        c.indexOf("busybox") !== -1 ||
        c.indexOf("magisk") !== -1 ||
        c.indexOf("getprop") !== -1 ||
        c.indexOf("mount") !== -1
      );
    }

    // Hook pour exec(String)
    execString.implementation = function (cmd) {
      if (isSuspiciousCommand(cmd)) {
        console.log("[+] Blocked Runtime.exec: " + cmd);
        return execString.call(this, "echo");
      }

      return execString.call(this, cmd);
    };

    // Hook pour exec(String[])
    execArray.implementation = function (arr) {
      var cmd = "";

      try {
        cmd = Java.array("java.lang.String", arr).join(" ");
      } catch (e) {
        cmd = arr.toString();
      }

      if (isSuspiciousCommand(cmd)) {
        console.log("[+] Blocked Runtime.exec array: " + cmd);
        return execString.call(this, "echo");
      }

      return execArray.call(this, arr);
    };

    console.log("[+] Runtime.exec hooks installed");
  } catch (e) {
    console.log("[-] Runtime.exec erreur : " + e);
  }

  console.log("[+] Java root bypass installed");
});