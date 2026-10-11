# Self-hosting on Debian with Nginx

The example address is `other-side.lukstins.com`. Replace that hostname throughout if using another one. Run the server installation commands as root. Use a new `/var/www/ouija` checkout, not an existing website directory. Existing system Node.js and Nginx sites stay in place. These instructions assume the new paths and service names are unused.

Debian 10 is out of support; schedule an OS upgrade separately. Node.js 24's published binary requirements include kernel >= 4.18, glibc >= 2.28 and libstdc++ with GLIBCXX_3.4.25. Debian 10 normally meets the library requirements, but check the installed kernel and the new binary before proceeding. Do not replace system libraries to force compatibility.

## 1. DNS and prerequisites

Create an A record for `other-side.lukstins.com` pointing to this server. If an AAAA record exists, it must also point to a reachable server serving this site. The templates use IPv4 listeners; add IPv6 listeners if you use IPv6. Ports 80 and 443 must be reachable. Port 3001 stays private and should not be opened publicly.

```sh
uname -m
uname -r
command -v git curl tar xz openssl
ss -ltn | grep ':3001'
```

The last command should show nothing; choose another port consistently if 3001 is occupied. If a prerequisite is missing, arrange its installation from supported, trusted sources before proceeding. Debian 10's retired package repositories may need OS maintenance; do not disable repository signature checking.

## 2. Install an isolated Node 24

This does not replace the existing Node 14. It downloads an official binary over verified HTTPS and checks its official SHA-256 checksum before extraction. The script refuses to overwrite `/opt/ouija-node24`.

```sh
bash <<'SCRIPT'
set -euo pipefail
case "$(uname -m)" in
  x86_64) ouija_arch=x64 ;;
  aarch64) ouija_arch=arm64 ;;
  *) echo 'Unsupported architecture'; exit 1 ;;
esac
ouija_archive="node-v24.19.0-linux-${ouija_arch}.tar.xz"
ouija_tmp=$(mktemp -d)
trap 'rm -rf "$ouija_tmp"' EXIT
cd "$ouija_tmp"
curl -fLO "https://nodejs.org/dist/v24.19.0/$ouija_archive"
curl -fLO https://nodejs.org/dist/v24.19.0/SHASUMS256.txt
awk -v file="$ouija_archive" '$2 == file' SHASUMS256.txt > selected-shasum.txt
sha256sum -c selected-shasum.txt
test ! -e /opt/ouija-node24
mkdir /opt/ouija-node24
tar -xJf "$ouija_archive" -C /opt/ouija-node24 --strip-components=1
/opt/ouija-node24/bin/node --version
SCRIPT
```

Expected version: `v24.19.0`. Stop if checksum verification or binary startup fails. Existing `node --version` still reports your old system Node; that is intentional.

## 3. Check out and build

```sh
adduser --system --group --home /var/www/ouija --no-create-home ouija
git clone https://github.com/lukstina/ouija.git /var/www/ouija
chown -R ouija:ouija /var/www/ouija
install -d -o ouija -g ouija /var/cache/ouija-npm
runuser -u ouija -- env PATH=/opt/ouija-node24/bin:/usr/local/bin:/usr/bin:/bin npm --prefix /var/www/ouija ci --cache /var/cache/ouija-npm
runuser -u ouija -- env PATH=/opt/ouija-node24/bin:/usr/local/bin:/usr/bin:/bin npm --prefix /var/www/ouija test
runuser -u ouija -- env PATH=/opt/ouija-node24/bin:/usr/local/bin:/usr/bin:/bin npm --prefix /var/www/ouija run build
```

No global npm installation is needed. The resulting `dist` directory contains the frontend. `server.mjs` serves it and runs the existing oracle handler at `/api/oracle`.

## 4. Key and application service

Use a root-only environment file, separate from the checkout:

```sh
test -e /etc/ouija.env || install -m 600 /dev/null /etc/ouija.env
nano /etc/ouija.env
```

Enter these settings in the editor, replacing the key placeholder. Never put the real key in a shell command, Git, or chat:

```dotenv
BITE_OPENAI_API_KEY=YOUR_OPENAI_API_KEY
BITE_OPENAI_MODEL=gpt-4.1-mini
BITE_AI_ENABLED=true
PORT=3001
```

Then:

```sh
chmod 600 /etc/ouija.env
cp /var/www/ouija/deploy/ouija.service /etc/systemd/system/ouija.service
systemctl daemon-reload
systemctl enable --now ouija
systemctl status ouija --no-pager
curl -fsS http://127.0.0.1:3001/health
curl -sS -i http://127.0.0.1:3001/api/oracle -H 'Content-Type: application/json' -d '{"question":"Who is calling from the Other side?"}'
```

The health response is `{"status":"ok"}`. Live AI should return HTTP 200 with `answer`. A 502 includes a safe diagnostic code; a 503 means the key is missing or AI is disabled. The health endpoint only verifies the application server, not OpenAI access. If needed, inspect `journalctl -u ouija -n 50 --no-pager`.

The systemd service reads `/etc/ouija.env`; it does not automatically load the laptop's `.env` file. Restart `ouija` after changing server settings.

## 5. Initial Nginx site

The Debian Nginx configuration must include `/etc/nginx/conf.d/*.conf` and `/etc/nginx/sites-enabled/*` inside its `http` block, as the standard Debian setup does. Keep existing site files. Edit `server_name` in the copied site if using another domain.

```sh
mkdir -p /var/www/ouija-acme
cp /var/www/ouija/deploy/nginx-rate-limit.conf /etc/nginx/conf.d/ouija-rate-limit.conf
cp /var/www/ouija/deploy/nginx-http.conf /etc/nginx/sites-available/ouija
nano /etc/nginx/sites-available/ouija
ln -s /etc/nginx/sites-available/ouija /etc/nginx/sites-enabled/ouija
nginx -t && systemctl reload nginx
curl -fsS -H 'Host: other-side.lukstins.com' http://127.0.0.1/health
```

If `nginx -t` fails, do not reload; resolve the reported error. Rate limiting is handled here, since Netlify's function limits do not apply to self-hosting: 10 requests/minute per IP with a burst of 3. People sharing one office network share this limit.

## 6. HTTPS certificate

If an existing certificate-management system already handles this domain, use it instead and place/reference its certificate in the HTTPS template. Otherwise the following installs the official acme.sh client in an isolated directory, using its GitHub source. Replace the account email and domain as appropriate. It uses HTTP webroot validation, so it does not stop Nginx.

```sh
git clone --depth 1 https://github.com/acmesh-official/acme.sh.git /opt/ouija-acme-source
cd /opt/ouija-acme-source
./acme.sh --install --home /opt/ouija-acme --accountemail you@example.com --nocron
/opt/ouija-acme/acme.sh --set-default-ca --server letsencrypt --home /opt/ouija-acme
/opt/ouija-acme/acme.sh --issue --server letsencrypt --home /opt/ouija-acme -d other-side.lukstins.com --webroot /var/www/ouija-acme --keylength ec-256
install -d -m 700 /etc/nginx/ssl/ouija
/opt/ouija-acme/acme.sh --install-cert --home /opt/ouija-acme -d other-side.lukstins.com --ecc --key-file /etc/nginx/ssl/ouija/privkey.pem --fullchain-file /etc/nginx/ssl/ouija/fullchain.pem --reloadcmd 'nginx -t && systemctl reload nginx'
```

Do not continue if issuance fails. Check public DNS, IPv6 records, and HTTP reachability. After certificates are installed:

```sh
cp /var/www/ouija/deploy/nginx-https.conf /etc/nginx/sites-available/ouija
nano /etc/nginx/sites-available/ouija
nginx -t && systemctl reload nginx
cp /var/www/ouija/deploy/ouija-cert-renew.service /etc/systemd/system/
cp /var/www/ouija/deploy/ouija-cert-renew.timer /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now ouija-cert-renew.timer
systemctl list-timers ouija-cert-renew.timer
curl -fsS https://other-side.lukstins.com/health
```

Edit the copied HTTPS configuration's hostnames if necessary. Certificate renewal is checked daily through the timer. No existing cron entries or other certificates are changed.

## 7. Verify and update

Open `https://other-side.lukstins.com`, submit a question, and confirm the board spells a reply and adds history. In developer tools, `/api/oracle` should return 200 to establish live AI is working; fallback animation alone does not prove that.

For later updates:

```sh
runuser -u ouija -- git -C /var/www/ouija pull --ff-only
runuser -u ouija -- env PATH=/opt/ouija-node24/bin:/usr/local/bin:/usr/bin:/bin npm --prefix /var/www/ouija ci --cache /var/cache/ouija-npm
runuser -u ouija -- env PATH=/opt/ouija-node24/bin:/usr/local/bin:/usr/bin:/bin npm --prefix /var/www/ouija test
runuser -u ouija -- env PATH=/opt/ouija-node24/bin:/usr/local/bin:/usr/bin:/bin npm --prefix /var/www/ouija run build
systemctl restart ouija
```

Run each update step only after the previous succeeds. Git-connected Netlify deployments remain independent; disable their auto-publishing in Netlify if no longer needed.

## Validation scope

The application server, frontend delivery, endpoint forwarding, private-file isolation, payload limits, existing oracle tests, and production frontend build were validated in the development environment. Installation, Nginx/systemd activation, DNS, certificate issuance, and live AI on your server still need to be executed and verified there.
