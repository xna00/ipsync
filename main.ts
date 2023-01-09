import { createTransport } from 'nodemailer';
import { getLocalIp } from './getIp';
import { closeConnection, detail, initImap, openConnectionAndInbox, remove, search } from './imap';
import { readFileSync, writeFileSync } from 'fs';

const argv = process.argv;
const user = argv[argv.findIndex(a => a === '-u') + 1];
const pass = argv[argv.findIndex(a => a === '-p') + 1];
const name = argv[argv.findIndex(a => a === '-n') + 1];
const hostsPath = argv[argv.findIndex(a => a === '-f') + 1] || '/etc/hosts';
const interval = Number(argv[argv.findIndex(a => a === '-i') + 1]);

if (!(user && pass && name && interval)) process.exit(1);

console.log(user, pass, name, interval);
initImap({ user, password: pass });

async function main() {
  try {
    await openConnectionAndInbox();
    const ips = await detail(await search('ip:'));
    console.log(ips);
    let host = readFileSync(hostsPath, 'utf8');
    ips.forEach(ip => {
      if (host.includes(ip.subject)) {
        host = host.replace(new RegExp(`.+\s+${ip.subject}`), `${ip.text} ${ip.subject}`);
      } else {
        host += `
          ${ip.text} ${ip.subject}`;
      }
    });
    writeFileSync(hostsPath, host);
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
      text: getLocalIp(),
    });
    transporter.close();
  } catch (e) {
    console.log(e);
  }

};

main();
setInterval(main, interval * 1000)
