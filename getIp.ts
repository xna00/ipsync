import os from 'os';

function getLocalIp(key = '') {
  const t = os.networkInterfaces()
  const res = Object.keys(t)
    .filter(k => !k.includes('rmnet') && k.includes(key))
    .map(k => t[k])
    .flat()
    .filter(item => item && !item.internal && (item.address.startsWith('192.') || item.address.startsWith('10.')));
  return res[0]?.address;
}

console.log(getLocalIp());
export { getLocalIp }
