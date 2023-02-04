import { createTransport } from 'nodemailer';
import { getLocalIp } from './getIp';
import { closeConnection, detail, initImap, openConnectionAndInbox, remove, search } from './imap';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const hostsPath = './hosts';
import { user, pass, name, interval, netKey } from './config.json';

if (!(user && pass && name && interval)) process.exit(1);

console.log(user, pass, name, interval);
initImap({ user, password: pass });

async function main() {
  try {
    await openConnectionAndInbox();
    const ips = await detail(await search('ip:'));
    console.log(ips);
    let host = readFileSync('/etc/hosts', 'utf8');
    ips.forEach(ip => {
      if (host.includes(ip.subject)) {
        host = host.replace(new RegExp(`.+\\s+${ip.subject}`), `${ip.text} ${ip.subject}`);
      } else {
        host += `
          ${ip.text} ${ip.subject}
          `;
      }
    });

    writeFileSync(resolve(__dirname, hostsPath), host);
    let tmp = ips.find(ip => ip.subject === name && ip.text === getLocalIp());
    await remove((await search(`ip:${name}`)).filter(uid => uid !== tmp?.uid));
    await closeConnection();
    if (tmp) {
      console.log('same as ', tmp, 'skip');
      return;
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

    transporter.sendMail({
      from: `Ip Sync <xie09101@outlook.com>`,
      to: '<xie09101@outlook.com>',
      subject: `ip:${name}`,
      text: getLocalIp(netKey),
    });
    transporter.close();
  } catch (e) {
    console.log(e);
  }

};

main();
if (interval && interval > 0) {
  setInterval(main, interval * 1000);
}
