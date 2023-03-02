import { createTransport } from 'nodemailer';
import { getLocalIp } from './getIp';
import { closeConnection, detail, initImap, openConnectionAndInbox, remove, search } from './imap';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const hostsPath = './hosts';
import { user, pass, name, interval, netKey } from './config.json';

if (!(user && pass && name && name.length && interval)) process.exit(1);

const localIp = getLocalIp(netKey);

console.log(user, pass, name, interval);
initImap({ user, password: pass });

async function main() {
  try {
    await openConnectionAndInbox();
    const ips = (await detail(await search('ip:'))).map(ip => ({
      ...ip,
      subject: ip.subject.replace(/\[|\]/g, '')
    }));
    console.log(ips);
    const host = readFileSync('/etc/hosts', 'utf8');
    const entries = host.split('\n')
      .map(line => line.trim())
      .filter(line => line.length)
      .map(line => line.split(/\s+/).reverse())
    const m = Object.fromEntries(entries)
    ips.forEach(ip => {
      m[ip.subject] = ip.text
    })

    const newHost = Object.entries(m)
      .map(entry => entry.reverse().join(' '))
      .join('\n') + '\n'

    writeFileSync(resolve(__dirname, hostsPath), newHost);
    const residue = name.filter((n) => {
      let tmp = ips.find(ip => ip.subject === n && ip.text === localIp);
      remove(ips.filter(ip => ip.subject === n && ip.text !== localIp).map(ip => ip.uid));
      if (tmp) {
        console.log(n, 'is same as ', tmp, 'skip');
      }
      return !tmp
    })
    await closeConnection();
    if (!residue.length) {
      console.log('nothing to sync')
      return
    }
    const transporter = createTransport({
      host: 'smtp.office365.com',
      port: 587,
      requireTLS: true,
      auth: {
        user,
        pass
      }
    });

    await Promise.allSettled(residue.map(n =>
      transporter.sendMail({
        from: `Ip Sync <xie09101@outlook.com>`,
        to: '<xie09101@outlook.com>',
        subject: `ip:[${n}]`,
        text: localIp,
      })
    ))
    transporter.close();
  } catch (e) {
    console.log(e);
  }

};

main();
if (interval && interval > 0) {
  setInterval(main, interval * 1000);
}
