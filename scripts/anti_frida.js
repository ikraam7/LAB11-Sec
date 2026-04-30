// anti_frida.js — Basic anti-Frida hiding for lab use
// Ce script masque la présence de Frida en hookant des méthodes Java pour éviter la détection.

Java.perform(function () {

  // Hook System.getenv pour masquer les variables d'environnement liées à Frida
  try {
    const Sys = Java.use("java.lang.System");

    Sys.getenv.overload("java.lang.String").implementation = function (name) {
      if (name && name.toLowerCase().indexOf("frida") !== -1) {
        console.log("[+] Hiding environment variable: " + name);
        return null; // Retourner null pour masquer
      }

      return this.getenv(name);
    };

    console.log("[+] System.getenv hook installed");
  } catch (e) {
    console.log("[-] System.getenv hook failed: " + e);
  }

  // Hook Socket.connect pour bloquer les connexions aux ports Frida
  try {
    const Socket = Java.use("java.net.Socket");

    Socket.connect.overload("java.net.SocketAddress").implementation = function (addr) {
      try {
        const s = addr.toString();

        // Bloquer les ports par défaut de Frida (27042 et 27043)
        if (s.indexOf(":27042") !== -1 || s.indexOf(":27043") !== -1) {
          console.log("[+] Blocked connection to Frida port: " + s);
          throw new Error("Connection refused");
        }
      } catch (_) {}

      return this.connect(addr);
    };

    console.log("[+] Socket.connect hook installed");
  } catch (e) {
    console.log("[-] Socket.connect hook failed: " + e);
  }

});