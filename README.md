## Project  Demo : watch the two videos 

##  Video 1 : Virtual Machines management

https://player.cloudinary.com/embed/?cloud_name=paypos&public_id=video-libvirt-creation-vmnovnc-ezgif.com-video-speed_gb8sgz&profile=cld-default

##  Video 2 : Live migration
https://player.cloudinary.com/embed/?cloud_name=paypos&public_id=migration-libvirt-russie-ezgif.com-video-speed_1_vbqzku&profile=cld-default


📘 1. Introduction au project : Libvirt Graphical Interface

Interface web complète en React + C/libvirt permettant de gérer un hyperviseur KVM :

- ✔ Lister les machines virtuelles  
- ✔ Créer une VM  
- ✔ Démarrer / arrêter / supprimer  
- ✔ Console graphique via **noVNC + TLS**  
- ✔ Migration *live* via **SSH sans mot de passe**  
- ✔ Backend 100% en C (libvirt + microhttpd + JSON)  
- ✔ Frontend moderne en React (Vite.js)  

Projet réalisé dans le cadre du module Virtualisation – INSA CVL



📦 2. Prérequis
⛓️ Système conseillé

Debian 12 ou Debian 13

Accès root sur les deux hyperviseurs ahmed et yacine

🔧 Paquets pour le Backend (C + libvirt)
sudo apt update
sudo apt install -y \
  libvirt-daemon-system libvirt-clients \
  libvirt-dev \
  libmicrohttpd-dev \
  libcjson-dev \
  gcc make git \
  openssh-server


Vérifier libvirt :

virsh list --all

🌐 Paquets pour le Frontend (React)
Node.js >= 18
npm >= 9


Installer Node.js si nécessaire :

sudo apt install -y nodejs npm

🖥️ Installer noVNC
cd ~
git clone https://github.com/novnc/noVNC.git


Créer le certificat TLS obligatoire :

mkdir -p ~/noVNC/certs
cd ~/noVNC/certs

openssl req -x509 -nodes -newkey rsa:2048 \
  -keyout novnc-self.pem \
  -out novnc-self.pem \
  -days 365 \
  -subj "/CN=192.168.160.136"


🔐 Ce fichier PEM contient clé privée + certificat, indispensable pour Websockify.

🔐 3. Configuration SSH pour migration live

La migration utilise :

qemu+ssh://user@<ip>/system


Créer une clé pour le user user sur chaque hyperviseur :

ssh-keygen -t ed25519 -C "libvirt-migration"


Copier la clé publique entre les deux nœuds :

ssh-copy-id user@192.168.160.135
ssh-copy-id user@192.168.160.136


Test :

ssh user@192.168.160.135
ssh user@192.168.160.136


✔ Aucun mot de passe ne doit être demandé
⚠️ Indispensable pour que virDomainMigrate() fonctionne correctement.

🚀 4. Installation du projet
🔵 Backend (C)
cd Libvirt-Graphical-interface/back
make clean
make
make run


Serveur disponible sur :

http://0.0.0.0:8080

🟦 Frontend (React)
cd Libvirt-Graphical-interface/front
npm install
npm run dev


Interface accessible via :

http://localhost:5173

🖥️ 5. Lancer noVNC (console graphique)
Option A — Lancer manuellement (pour tester)
cd ~/noVNC
./utils/novnc_proxy \
  --vnc 127.0.0.1:5901 \
  --listen 6900 \
  --cert ~/noVNC/certs/novnc-self.pem \
  --ssl-only \
  --web ~/noVNC


URL :

https://192.168.160.136:6900/vnc.html

Option B — Gestion automatique par le Backend

À chaque ouverture de console, le backend lance :

nohup novnc_proxy \
  --vnc 127.0.0.1:<VNC_PORT> \
  --listen <WS_PORT> \
  --web ~/noVNC \
  --cert ~/noVNC/certs/novnc-self.pem \
  --ssl-only &

🧪 6. Utilisation
1️⃣ Connexion à l'hyperviseur

Dans la page ConnectHypervisor :

Protocole : qemu

URI : qemu:///system

2️⃣ Liste et gestion des VMs

Sur ListAllVms :

Start / Stop / Shutdown / Delete

Ouverture console (noVNC + TLS)

Migration live en cliquant Migrate

3️⃣ Migration live

Dans le modal Migrate :

Exemple de destination :

qemu+ssh://user@192.168.160.135/system


Le backend applique :

VIR_MIGRATE_LIVE

VIR_MIGRATE_UNDEFINE_SOURCE

VIR_MIGRATE_PERSIST_DEST

🧰 7. Dépannage
VNC ne répond pas ?
virsh domdisplay <vm>
ss -ltnp | grep 5900

Test du proxy noVNC
curl -vk https://127.0.0.1:<wsPort>/vnc.html

Le front ouvre une mauvaise URL ?

Regarder la console JS (F12 → Console) :

console.log("Opening Console:", url);

Migration échoue ?
Network 'default' not active


→ Activer le réseau libvirt :

virsh net-start default
virsh net-autostart default

🛡️ 8. Sécurité

Proxy noVNC sécurisé via TLS (--ssl-only)

Migration via SSH keys (pas de mot de passe)

Certificats auto-signés → avertissement normal dans les navigateurs

Libvirt tournant en mode non-root via qemu:///system

📜 9. Licence

Projet académique – INSA Centre Val de Loire — Filière Systèmes & Réseaux — Virtualisation
Auteurs : Yacine SAID & Ahmed SAFTA

🏁 10. Roadmap (Améliorations futures)

Authentification utilisateur côté front

Gestion stockage (création pools/disks)

Snapshots + rollback depuis l’UI

Monitoring ressources live

Support LXC

Support multi-hyperviseurs permanent

